import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createProductSchema } from '@repo/shared';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import type { AuthContext } from '@repo/auth';
import type { CatalogProductResponse } from '@repo/shared';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('catalogs:read')(async (
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

  const products = await prisma.catalogProduct.findMany({
    where: { catalogId: params.id },
    orderBy: { name: 'asc' },
  });

  const result: CatalogProductResponse[] = products.map((p) => ({
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
  }));

  return NextResponse.json({ products: result });
});

export const POST = withAuthAndPermission('catalogs:update')(async (
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

  const body = await request.json();
  const validation = createProductSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: catalog.whatsappAccount!, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'حساب واتساب غير موجود' }, { status: 404 });
  }

  const accessToken = decrypt(account.accessToken);
  const client = new WhatsAppClient();

  try {
    const metaProductId = await client.createProduct(
      {
        phoneId: account.phoneId,
        businessId: account.businessId,
        apiVersion: account.apiVersion,
        accessToken,
      } as any,
      catalog.metaCatalogId,
      {
        name: data.name,
        price: data.price,
        currency: data.currency,
        url: data.url || '',
        imageUrl: data.imageUrl || '',
        retailerId: data.retailerId || '',
        description: data.description,
      },
    );

    const product = await prisma.catalogProduct.create({
      data: {
        organizationId: context.tenantId,
        catalogId: params.id,
        metaProductId,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        url: data.url || null,
        imageUrl: data.imageUrl || null,
        retailerId: data.retailerId || null,
        isActive: true,
      },
    });

    await logAudit(
      context.userId,
      context.email,
      'catalogProduct',
      product.id,
      'created',
      [{ field: 'name', newValue: product.name }, { field: 'catalogId', newValue: params.id }],
      context.tenantId,
    );

    const response: CatalogProductResponse = {
      id: product.id,
      metaProductId: product.metaProductId,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      url: product.url,
      imageUrl: product.imageUrl,
      retailerId: product.retailerId,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'فشل إنشاء المنتج' }, { status: 500 });
  }
});
