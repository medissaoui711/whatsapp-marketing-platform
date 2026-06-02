import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createCatalogSchema } from '@repo/shared';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import type { AuthContext } from '@repo/auth';
import type { CatalogResponse } from '@repo/shared';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('catalogs:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const whatsappAccount = searchParams.get('whatsapp_account');

  const where: any = { organizationId: context.tenantId };
  if (whatsappAccount) {
    where.whatsappAccount = whatsappAccount;
  }

  const catalogs = await prisma.catalog.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      products: { select: { id: true } },
    },
  });

  const result: CatalogResponse[] = catalogs.map((c) => ({
    id: c.id,
    metaCatalogId: c.metaCatalogId,
    whatsappAccount: c.whatsappAccount,
    name: c.name,
    isActive: c.isActive,
    productCount: c.products.length,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return NextResponse.json({ catalogs: result });
});

export const POST = withAuthAndPermission('catalogs:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const body = await request.json();
  const validation = createCatalogSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const { whatsappAccount, name } = validation.data;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: whatsappAccount, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'حساب واتساب غير موجود' }, { status: 404 });
  }

  const accessToken = decrypt(account.accessToken);
  const client = new WhatsAppClient();

  try {
    const metaCatalogId = await client.createCatalog(
      {
        phoneId: account.phoneId,
        businessId: account.businessId,
        apiVersion: account.apiVersion,
        accessToken,
      } as any,
      name,
    );

    const catalog = await prisma.catalog.create({
      data: {
        organizationId: context.tenantId,
        whatsappAccount,
        metaCatalogId,
        name,
        isActive: true,
      },
    });

    await logAudit(
      context.userId,
      context.email,
      'catalog',
      catalog.id,
      'created',
      [{ field: 'name', newValue: catalog.name }, { field: 'metaCatalogId', newValue: metaCatalogId }],
      context.tenantId,
    );

    const response: CatalogResponse = {
      id: catalog.id,
      metaCatalogId: catalog.metaCatalogId,
      whatsappAccount: catalog.whatsappAccount,
      name: catalog.name,
      isActive: catalog.isActive,
      productCount: 0,
      createdAt: catalog.createdAt.toISOString(),
      updatedAt: catalog.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create catalog:', error);
    return NextResponse.json({ error: 'فشل إنشاء الكتالوج' }, { status: 500 });
  }
});


