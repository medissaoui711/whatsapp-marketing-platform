import { prisma } from '@repo/db';
import { hasPermission } from '@repo/shared';
import { type AuthContext } from './with-auth';

export interface FeatureCheck {
  allowed: boolean;
  reason?: string;
  message?: string;
}

export async function checkFeatureAccess(
  featureKey: string,
  context: AuthContext
): Promise<FeatureCheck> {
  const feature = await prisma.feature.findUnique({
    where: { key: featureKey, isEnabled: true },
    include: {
      tenantFeatures: {
        where: { tenantId: context.tenantId, isActive: true },
      },
    },
  });

  if (!feature) {
    return {
      allowed: false,
      reason: 'feature_not_available',
      message: 'هذه الميزة غير متوفرة في النظام',
    };
  }

  if (feature.tenantFeatures.length === 0) {
    return {
      allowed: false,
      reason: 'feature_not_active',
      message: 'هذه الميزة غير مفعلة لمؤسستك',
    };
  }

  if (!hasPermission(context.role, 'features:use')) {
    return {
      allowed: false,
      reason: 'missing_permission',
      message: 'لا تملك الصلاحية لاستخدام هذه الميزة',
    };
  }

  return { allowed: true };
}

export const FEATURE_PATH_MAP: Record<string, string> = {
  '/api/scraping': 'social_media_scraper',
  '/api/groups/join': 'whatsapp_join_groups',
  '/api/groups/search': 'whatsapp_search_groups',
  '/api/messaging/educational': 'whatsapp_educational_messaging',
};
