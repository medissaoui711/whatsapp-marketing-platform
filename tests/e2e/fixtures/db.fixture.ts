import { test as base } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

type DbFixture = {
  db: PrismaClient;
};

export const test = base.extend<DbFixture>({
  db: async ({}, use) => {
    const prisma = new PrismaClient();
    await prisma.$connect();

    await prisma.$executeRawUnsafe(`BEGIN`);

    await use(prisma);

    await prisma.$executeRawUnsafe(`ROLLBACK`);
    await prisma.$disconnect();
  },
});

export { expect } from '@playwright/test';
