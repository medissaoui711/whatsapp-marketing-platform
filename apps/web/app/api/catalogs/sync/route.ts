import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import { syncCatalogsSchema } from '@repo/shared';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('catalogs:sync')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const body = await request.json();
  const validation = syncCatalogsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const { whatsappAccount } = validation.data;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: whatsappAccount, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'حساب واتساب غير موجود' }, { status: 404 });
  }

  const accessToken = decrypt(account.accessToken);
  const client = new WhatsAppClient();

  try {
    const metaCatalogs = await client.listCatalogs({
      phoneId: account.phoneId,
      businessId: account.businessId,
      apiVersion: account.apiVersion,
      accessToken,
    } as any);

    let synced = 0;

    for (const mc of metaCatalogs) {
      const existing = await prisma.catalog.findFirst({
        where: {
          organizationId: context.tenantId,
          metaCatalogId: mc.id,
        },
      });

      if (!existing) {
        await prisma.catalog.create({
          data: {
            organizationId: context.tenantId,
            whatsappAccount,
            metaCatalogId: mc.id,
            name: mc.name,
            isActive: true,
          },
        });
        synced++;
      } else {
        if (existing.name !== mc.name) {
          await prisma.catalog.update({
            where: { id: existing.id },
            data: { name: mc.name },
          });
        }
        synced++;
      }
    }

    return NextResponse.json({
      message: 'تمت المزامنة بنجاح',
      synced,
      total: metaCatalogs.length,
    });
  } catch (error) {
    console.error('Failed to sync catalogs:', error);
    return NextResponse.json({ error: 'فشلت مزامنة الكتالوجات' }, { status: 500 });
  }
});


