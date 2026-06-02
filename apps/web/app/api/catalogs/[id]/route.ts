import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import type { AuthContext } from '@repo/auth';
import type { CatalogResponse, CatalogProductResponse } from '@repo/shared';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('catalogs:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const catalog = await prisma.catalog.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: { products: true },
  });

  if (!catalog) {
    return NextResponse.json({ error: 'الكتالوج غير موجود' }, { status: 404 });
  }

  const response: CatalogResponse = {
    id: catalog.id,
    metaCatalogId: catalog.metaCatalogId,
    whatsappAccount: catalog.whatsappAccount,
    name: catalog.name,
    isActive: catalog.isActive,
    productCount: catalog.products.length,
    products: catalog.products.map((p) => ({
      id: p.id,
      metaProductId: p.metaProductId,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      url: p.url,
      imageUrl: p.imageUrl,
      retailerId: p.retailerId,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    createdAt: catalog.createdAt.toISOString(),
    updatedAt: catalog.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const DELETE = withAuthAndPermission('catalogs:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const catalog = await prisma.catalog.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!catalog) {
    return NextResponse.json({ error: 'الكتالوج غير موجود' }, { status: 404 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: catalog.whatsappAccount!, organizationId: context.tenantId },
  });

  if (account) {
    const accessToken = decrypt(account.accessToken);
    const client = new WhatsAppClient();

    try {
      await client.deleteCatalog(
        {
          phoneId: account.phoneId,
          businessId: account.businessId,
          apiVersion: account.apiVersion,
          accessToken,
        } as any,
        catalog.metaCatalogId,
      );
    } catch (error) {
      console.error('Failed to delete catalog from Meta:', error);
    }
  }

  await prisma.catalogProduct.deleteMany({
    where: { catalogId: params.id },
  });

  await prisma.catalog.delete({
    where: { id: params.id },
  });

  await logAudit(
    context.userId,
    context.email,
    'catalog',
    params.id,
    'deleted',
    [{ field: 'name', oldValue: catalog.name }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم حذف الكتالوج' });
});
