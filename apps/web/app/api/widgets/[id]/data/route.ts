import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { executeWidgetQuery } from '@/app/services/widget-query';

export const GET = withAuthAndPermission('analytics:read', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const widget = await prisma.widget.findFirst({
    where: { id: params.id, organizationId: req.organizationId },
  });
  if (!widget) {
    return NextResponse.json({ error: 'Widget not found.' }, { status: 404 });
  }

  if (widget.userId && widget.userId !== req.userId && !widget.isShared) {
    return NextResponse.json({ error: 'Widget not accessible.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || undefined;

  const result = await executeWidgetQuery({
    organizationId: req.organizationId,
    dataSource: widget.dataSource,
    metric: widget.metric,
    field: widget.field || undefined,
    filters: (widget.filters as any[]) || [],
    groupByField: widget.groupByField || undefined,
    period,
    userId: req.userId,
  });

  return NextResponse.json(result);
});
