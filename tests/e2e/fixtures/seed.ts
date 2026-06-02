import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Seeding E2E test database...');

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'شركة تجريبية',
      slug: 'demo-company',
    },
  });

  const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
  const existingUser = await prisma.user.findUnique({ where: { email: 'owner@demo.com' } });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        organizationId: org.id,
        email: 'owner@demo.com',
        passwordHash: hashedPassword,
        fullName: 'مدير النظام',
        isActive: true,
      },
    });
  }

  const existingTemplates = await prisma.template.count({ where: { organizationId: org.id } });
  if (existingTemplates === 0) {
    await prisma.template.create({
      data: {
        organizationId: org.id,
        name: 'قالب ترحيبي',
        displayName: 'Welcome Template',
        whatsappAccount: 'e2e-test-account',
        bodyContent: 'مرحباً {{firstName}}، نشكرك على انضمامك إلينا!',
        category: 'marketing',
        status: 'APPROVED',
      },
    });

    await prisma.template.create({
      data: {
        organizationId: org.id,
        name: 'تذكير بالموعد',
        displayName: 'Appointment Reminder',
        whatsappAccount: 'e2e-test-account',
        bodyContent: 'تذكير بموعدك غداً {{date}} مع {{businessName}}',
        category: 'utility',
        status: 'APPROVED',
      },
    });
  }

  console.log('✅ Seeding completed');
}
