import bcrypt from 'bcryptjs';
import { defaultPermissions, systemRolePermissions } from './permissions';
import { getPrisma } from '../connection';

const prisma = getPrisma();

export async function seedPermissions(): Promise<void> {
  console.log('Seeding permissions...');

  for (const perm of defaultPermissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
  }

  console.log(`Seeded ${defaultPermissions.length} permissions`);
}

export async function seedSystemRolesForOrg(organizationId: string): Promise<void> {
  console.log(`Seeding system roles for organization ${organizationId}...`);

  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(
    allPermissions.map(p => [`${p.resource}:${p.action}`, p.id])
  );

  for (const [roleName, permKeys] of Object.entries(systemRolePermissions)) {
    const permIds = permKeys
      .map(key => permMap.get(key))
      .filter((id): id is string => id !== undefined);

    const rolePermRecords = permIds.map(permissionId => ({ permissionId }));

    await prisma.customRole.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: roleName,
        },
      },
      update: {},
      create: {
        organizationId,
        name: roleName,
        description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
        isSystem: true,
        isDefault: roleName === 'agent',
        rolePermissions: {
          create: rolePermRecords,
        },
      },
    });
  }

  console.log('Seeded system roles (admin, manager, agent)');
}

export async function createDefaultAdmin(
  email: string,
  password: string,
  fullName: string
): Promise<{ userId: string; organizationId: string }> {
  console.log('Creating default admin...');

  let organization = await prisma.organization.findFirst({
    where: { slug: 'default' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: 'default',
        settings: {
          primaryColor: '#3b82f6',
          timezone: 'UTC',
        },
      },
    });
    console.log(`Created organization: ${organization.id}`);
  } else {
    console.log(`Using existing organization: ${organization.id}`);
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { email },
  });

  if (existingAdmin) {
    console.log(`Admin already exists: ${email}`);
    return {
      userId: existingAdmin.id,
      organizationId: organization.id,
    };
  }

  let agentRole = await prisma.customRole.findFirst({
    where: {
      organizationId: organization.id,
      name: 'agent',
      isSystem: true,
    },
  });

  if (!agentRole) {
    await seedSystemRolesForOrg(organization.id);
    agentRole = await prisma.customRole.findFirst({
      where: {
        organizationId: organization.id,
        name: 'agent',
        isSystem: true,
      },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      fullName,
      organizationId: organization.id,
      roleId: agentRole?.id,
      isActive: true,
      isSuperAdmin: true,
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      roleId: agentRole?.id,
      isDefault: true,
    },
  });

  console.log(`Created default admin: ${email}`);
  return {
    userId: user.id,
    organizationId: organization.id,
  };
}

export async function seedDemoData(organizationId: string): Promise<void> {
  console.log('Seeding demo data...');

  const demoAccount = await prisma.whatsAppAccount.upsert({
    where: { organizationId_name: { organizationId, name: 'demo' } },
    update: {},
    create: {
      organizationId,
      name: 'demo',
      phoneId: '123456789',
      businessId: '987654321',
      accessToken: 'enc:demo-token',
      apiVersion: 'v21.0',
      status: 'active',
      isDefaultIncoming: true,
      isDefaultOutgoing: true,
    },
  });
  console.log(`Created demo WhatsApp account`);

  const contacts = [
    { phoneNumber: '+966501234567', profileName: 'أحمد محمد' },
    { phoneNumber: '+966502345678', profileName: 'سارة عبدالله' },
    { phoneNumber: '+966503456789', profileName: 'محمد علي' },
  ];

  for (const contact of contacts) {
    const existing = await prisma.contact.findFirst({
      where: { phoneNumber: contact.phoneNumber, organizationId },
    });
    if (!existing) {
      await prisma.contact.create({
        data: {
          organizationId,
          ...contact,
          whatsappAccount: demoAccount.name,
        },
      });
    }
  }
  console.log(`Created ${contacts.length} sample contacts`);

  const template = await prisma.template.create({
    data: {
      organizationId,
      whatsappAccount: demoAccount.name,
      name: 'welcome_message',
      displayName: 'Welcome Message',
      language: 'en',
      category: 'UTILITY',
      status: 'APPROVED',
      bodyContent: 'Welcome {{1}}! Thank you for choosing our service.',
    },
  });
  console.log(`Created sample template: ${template.name}`);

  console.log('Demo data seeding completed');
}

export async function runAllSeeds(): Promise<void> {
  console.log('Starting database seeding...');

  await seedPermissions();

  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const defaultAdminName = process.env.DEFAULT_ADMIN_NAME || 'System Administrator';

  const { organizationId } = await createDefaultAdmin(
    defaultAdminEmail,
    defaultAdminPassword,
    defaultAdminName
  );

  if (process.env.SEED_DEMO_DATA === 'true') {
    await seedDemoData(organizationId);
  }

  console.log('Database seeding completed!');
}


