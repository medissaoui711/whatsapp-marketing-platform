import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const features = [
  {
    key: 'whatsapp_educational_messaging',
    name: 'إرسال رسائل تعليمية',
    description: 'إرسال رسائل نصية أو وسائط تعليمية عبر واتساب',
    category: 'messaging',
    configSchema: { dailyLimit: 1000, allowMedia: true, maxMediaSizeMB: 16 },
  },
  {
    key: 'whatsapp_join_groups',
    name: 'الانضمام إلى مجموعات واتساب',
    description: 'الانضمام تلقائياً إلى مجموعات واتساب عبر روابط الدعوة',
    category: 'groups',
    configSchema: { maxGroupsPerDay: 10, requireUserConsent: true },
  },
  {
    key: 'whatsapp_search_groups',
    name: 'البحث عن مجموعات واتساب',
    description: 'البحث عن مجموعات واتساب حسب الكلمات المفتاحية',
    category: 'groups',
    configSchema: { rateLimit: 30, perMinute: 5 },
  },
  {
    key: 'social_media_scraper',
    name: 'مستخرج بيانات وسائل التواصل',
    description: 'استخراج بيانات الملفات الشخصية من منصات التواصل',
    category: 'scraping',
    configSchema: {
      rateLimit: 60,
      perMinute: 10,
      allowedPlatforms: ['twitter', 'instagram', 'linkedin'],
    },
  },
];

export async function seedFeatures() {
  console.log('🌱 Seeding features...');

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      update: {},
      create: feature,
    });
  }

  console.log(`✅ ${features.length} features seeded`);

  const demo = await prisma.organization.findUnique({ where: { slug: 'demo-company' } });
  if (demo) {
    const allFeatures = await prisma.feature.findMany();

    for (const feature of allFeatures) {
      await prisma.tenantFeature.upsert({
        where: { tenantId_featureId: { tenantId: demo.id, featureId: feature.id } },
        update: { isActive: true },
        create: {
          tenantId: demo.id,
          featureId: feature.id,
          isActive: true,
          settings: feature.configSchema || {},
        },
      });
    }

    console.log(`✅ Features activated for tenant: ${demo.slug}`);
  }
}

seedFeatures()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
