import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuth } from '@repo/auth';
import { hasPermission } from '@repo/shared';
import { groupJoinService } from '@repo/integrations/whatsapp/groups/join-service';
import { z } from 'zod';

const joinRequestSchema = z.object({
  groupId: z.string(),
  inviteLink: z.string().url(),
  groupName: z.string().min(1),
  autoJoin: z.boolean().default(false),
});

export const POST = withAuth(async (request, context) => {
  try {
    const feature = await prisma.feature.findUnique({
      where: { key: 'whatsapp_join_groups', isEnabled: true },
    });

    if (!feature) {
      return NextResponse.json(
        { error: 'Join groups feature is not available' },
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
        { error: 'Join groups is not enabled for your organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(context.role, 'features:use')) {
      return NextResponse.json(
        { error: 'You do not have permission to use this feature' },
        { status: 403 }
      );
    }

    const hasConsent = await groupJoinService.hasConsent(context.tenantId, context.userId);
    if (!hasConsent) {
      return NextResponse.json(
        {
          requiresConsent: true,
          message: 'You must provide consent before joining WhatsApp groups',
          consentUrl: '/api/whatsapp/groups/consent',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = joinRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { groupId, inviteLink, groupName, autoJoin } = validation.data;

    const joinRequest = await groupJoinService.requestJoin(
      context.tenantId,
      context.userId,
      context.email,
      groupId,
      inviteLink,
      groupName,
      autoJoin
    );

    await prisma.featureUsage.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        featureId: feature.id,
        action: 'request_join',
        metadata: { groupId, groupName, autoJoin },
      },
    });

    await prisma.tenantFeature.update({
      where: { id: tenantFeature.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      joinRequest,
      message: 'Join request created. Please approve to join the group.',
    });
  } catch (error: any) {
    console.error('Group join error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
