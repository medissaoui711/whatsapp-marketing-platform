import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateProductSchema } from '@repo/shared';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import type { AuthContext } from '@repo/auth';
import type { CatalogProductResponse } from '@repo/shared';
import { logAudit, generateChanges } from '@repo/audit';

export const GET = withAuthAndPermission('catalogs:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const product = await prisma.catalogProduct.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!product) {
    return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
  }

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

  return NextResponse.json(response);
});

export const PUT = withAuthAndPermission('catalogs:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const product = await prisma.catalogProduct.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: { catalog: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateProductSchema.safeParse(body);

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
    where: { name: product.catalog.whatsappAccount!, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'حساب واتساب غير موجود' }, { status: 404 });
  }

  const accessToken = decrypt(account.accessToken);
  const client = new WhatsAppClient();

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.url !== undefined) updateData.url = data.url || null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
  if (data.retailerId !== undefined) updateData.retailerId = data.retailerId || null;

  try {
    await client.updateProduct(
      {
        phoneId: account.phoneId,
        businessId: account.businessId,
        apiVersion: account.apiVersion,
        accessToken,
      } as any,
      product.metaProductId,
      updateData,
    );

    const updated = await prisma.catalogProduct.update({
      where: { id: params.id },
      data: updateData,
    });

    const changes = generateChanges(product, updateData);
    await logAudit(
      context.userId,
      context.email,
      'catalogProduct',
      updated.id,
      'updated',
      changes,
      context.tenantId,
    );

    const response: CatalogProductResponse = {
      id: updated.id,
      metaProductId: updated.metaProductId,
      name: updated.name,
      description: updated.description,
      price: updated.price,
      currency: updated.currency,
      url: updated.url,
      imageUrl: updated.imageUrl,
      retailerId: updated.retailerId,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'فشل تحديث المنتج' }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission('catalogs:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const product = await prisma.catalogProduct.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: { catalog: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: product.catalog.whatsappAccount!, organizationId: context.tenantId },
  });

  if (account) {
    const accessToken = decrypt(account.accessToken);
    const client = new WhatsAppClient();

    try {
      await client.deleteProduct(
        {
          phoneId: account.phoneId,
          businessId: account.businessId,
          apiVersion: account.apiVersion,
          accessToken,
        } as any,
        product.metaProductId,
      );
    } catch (error) {
      console.error('Failed to delete product from Meta:', error);
    }
  }

  await prisma.catalogProduct.delete({
    where: { id: params.id },
  });

  await logAudit(
    context.userId,
    context.email,
    'catalogProduct',
    params.id,
    'deleted',
    [{ field: 'name', oldValue: product.name }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم حذف المنتج' });
});
