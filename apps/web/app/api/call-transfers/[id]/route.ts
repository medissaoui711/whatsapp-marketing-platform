import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { utils } from '@/lib/utils';

export const GET = withAuthAndPermission('call_transfers:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const transfer = await prisma.callTransfer.findFirst({
    where: {
      id: params.id,
      organizationId: context.tenantId,
    },
    include: {
      contact: true,
      agent: { select: { id: true, fullName: true, email: true } },
      initiatingAgent: { select: { id: true, fullName: true, email: true } },
      callLog: true,
    },
  });

  if (!transfer) {
    return NextResponse.json({ error: 'Call transfer not found' }, { status: 404 });
  }

  const shouldMask = await utils.shouldMaskPhoneNumbers(context.tenantId);

  const maskedTransfer = {
    ...transfer,
    callerPhone: shouldMask ? utils.maskPhoneNumber(transfer.callerPhone) : transfer.callerPhone,
    contact: transfer.contact
      ? {
          ...transfer.contact,
          phoneNumber: shouldMask
            ? utils.maskPhoneNumber(transfer.contact.phoneNumber)
            : transfer.contact.phoneNumber,
          profileName: shouldMask
            ? utils.maskIfPhoneNumber(transfer.contact.profileName)
            : transfer.contact.profileName,
        }
      : null,
  };

  return NextResponse.json(maskedTransfer);
});
