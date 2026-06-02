import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { widgetLayoutSchema } from '@repo/shared/src/schemas/widget';

export const PUT = withAuthAndPermission('analytics:write', async (req: NextRequest) => {
  const body = await req.json();
  const parsed = widgetLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const widgetIds = parsed.data.widgets.map(w => w.id);
  const owned = await prisma.widget.findMany({
    where: {
      id: { in: widgetIds },
      organizationId: req.organizationId,
    },
    select: { id: true, userId: true },
  });

  const ownedIds = new Set(owned.filter(w => !w.userId || w.userId === req.userId).map(w => w.id));
  const invalid = widgetIds.filter(id => !ownedIds.has(id));
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'Some widgets are not editable by you', invalidWidgets: invalid }, { status: 403 });
  }

  await prisma.$transaction(
    parsed.data.widgets.map(w =>
      prisma.widget.update({
        where: { id: w.id },
        data: { gridX: w.gridX, gridY: w.gridY, gridW: w.gridW, gridH: w.gridH },
      })
    )
  );

  return NextResponse.json({ success: true });
});



