import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { extractTenantContext } from '@repo/auth';
import { hasPermission } from '@repo/shared';

export async function POST(req: NextRequest) {
  try {
    const { featureKey, action, metadata } = await req.json();
    const context = extractTenantContext(req);

    if (!context) {
      return NextResponse.json(
        { allowed: false, reason: 'not_authenticated', message: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    const feature = await prisma.feature.findUnique({
      where: { key: featureKey, isEnabled: true },
    });

    if (!feature) {
      return NextResponse.json({
        allowed: false,
        reason: 'feature_not_available',
        message: 'هذه الميزة غير متوفرة في النظام',
      });
    }

    const tenantFeature = await prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureId: { tenantId: context.tenantId, featureId: feature.id },
      },
    });

    if (!tenantFeature || !tenantFeature.isActive) {
      return NextResponse.json({
        allowed: false,
        reason: 'feature_not_active_for_tenant',
        message: 'هذه الميزة غير مفعلة لمؤسستك. تواصل مع المدير لتفعيلها',
      });
    }

    if (!hasPermission(context.role, 'features:use')) {
      return NextResponse.json({
        allowed: false,
        reason: 'missing_permission',
        message: 'لا تملك الصلاحية لاستخدام هذه الميزة',
      });
    }

    const settings = (tenantFeature.settings as Record<string, unknown>) || {};
    const dailyLimit = (settings.dailyLimit as number) || 100;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageToday = await prisma.featureUsage.count({
      where: {
        tenantId: context.tenantId,
        featureId: feature.id,
        createdAt: { gte: today },
      },
    });

    if (usageToday >= dailyLimit) {
      return NextResponse.json({
        allowed: false,
        reason: 'daily_limit_exceeded',
        message: `لقد تجاوزت الحد اليومي (${dailyLimit}) لهذه الميزة`,
        limit: dailyLimit,
        used: usageToday,
      });
    }

    if (action && context.userId) {
      await prisma.featureUsage.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId,
          featureId: feature.id,
          action,
          metadata: metadata || {},
        },
      });

      await prisma.tenantFeature.update({
        where: { id: tenantFeature.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      allowed: true,
      settings,
      remaining: dailyLimit - usageToday - 1,
      limit: dailyLimit,
    });
  } catch (error) {
    console.error('Feature check error:', error);
    return NextResponse.json(
      { allowed: false, reason: 'internal_error', message: 'حدث خطأ داخلي' },
      { status: 500 }
    );
  }
}
