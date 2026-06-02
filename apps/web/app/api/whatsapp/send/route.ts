import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { extractTenantContext } from '@repo/auth';
import { hasPermission } from '@repo/shared';
import { addMessageToQueue } from '@/lib/queue/educational-message';
import { z } from 'zod';

const sendMessageSchema = z.object({
  to: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in international format (+1234567890)'),
  templateName: z.string().min(1),
  templateLanguage: z.enum(['en', 'ar']),
  parameters: z.record(z.string()),
  campaignId: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = extractTenantContext(req);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const feature = await prisma.feature.findUnique({
      where: { key: 'whatsapp_educational_messaging', isEnabled: true },
    });

    if (!feature) {
      return NextResponse.json(
        { error: 'Educational messaging feature is not available' },
        { status: 403 }
      );
    }

    const tenantFeature = await prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureId: { tenantId: context.tenantId, featureId: feature.id },
      },
    });

    if (!tenantFeature || !tenantFeature.isActive) {
      return NextResponse.json(
        {
          error:
            'Educational messaging is not enabled for your organization. Please contact your administrator.',
        },
        { status: 403 }
      );
    }

    if (!hasPermission(context.role, 'features:use')) {
      return NextResponse.json(
        { error: 'You do not have permission to use this feature' },
        { status: 403 }
      );
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
      return NextResponse.json(
        {
          error: 'Daily limit exceeded',
          message: `You have reached your daily limit of ${dailyLimit} messages. Please try again tomorrow.`,
          limit: dailyLimit,
          used: usageToday,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { to, templateName, templateLanguage, parameters, campaignId, scheduledFor } =
      validation.data;

    const job = await addMessageToQueue(
      {
        to,
        templateName,
        templateLanguage,
        parameters,
        tenantId: context.tenantId,
        userId: context.userId,
        campaignId,
      },
      scheduledFor ? new Date(scheduledFor).getTime() - Date.now() : 0
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Message queued successfully',
      quota: {
        remaining: dailyLimit - usageToday - 1,
        limit: dailyLimit,
        used: usageToday + 1,
      },
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
