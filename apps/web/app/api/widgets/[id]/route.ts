import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { widgetSchema } from '@repo/shared/src/schemas/widget';

async function getWidget(req: NextRequest, id: string) {
  const widget = await prisma.widget.findFirst({
    where: { id, organizationId: req.organizationId },
  });
  if (!widget) {
    return NextResponse.json({ error: 'Widget not found.' }, { status: 404 });
  }
  return widget;
}

export const GET = withAuthAndPermission('analytics:read', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const widget = await getWidget(req, params.id);
  if (widget instanceof NextResponse) return widget;

  return NextResponse.json({
    id: widget.id,
    name: widget.name,
    description: widget.description,
    dataSource: widget.dataSource,
    metric: widget.metric,
    field: widget.field,
    filters: widget.filters,
    displayType: widget.displayType,
    chartType: widget.chartType,
    groupByField: widget.groupByField,
    showChange: widget.showChange,
    color: widget.color,
    size: widget.size,
    displayOrder: widget.displayOrder,
    gridX: widget.gridX,
    gridY: widget.gridY,
    gridW: widget.gridW,
    gridH: widget.gridH,
    config: widget.config,
    isShared: widget.isShared,
    isDefault: widget.isDefault,
    userId: widget.userId,
    createdAt: widget.createdAt.toISOString(),
    updatedAt: widget.updatedAt.toISOString(),
  });
});

export const PUT = withAuthAndPermission('analytics:write', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const widget = await getWidget(req, params.id);
  if (widget instanceof NextResponse) return widget;

  if (widget.userId && widget.userId !== req.userId) {
    return NextResponse.json({ error: 'Only the widget owner can edit this widget.' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = widgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.widget.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    dataSource: updated.dataSource,
    metric: updated.metric,
    field: updated.field,
    filters: updated.filters,
    displayType: updated.displayType,
    chartType: updated.chartType,
    groupByField: updated.groupByField,
    showChange: updated.showChange,
    color: updated.color,
    size: updated.size,
    displayOrder: updated.displayOrder,
    gridX: updated.gridX,
    gridY: updated.gridY,
    gridW: updated.gridW,
    gridH: updated.gridH,
    config: updated.config,
    isShared: updated.isShared,
    isDefault: updated.isDefault,
    userId: updated.userId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export const DELETE = withAuthAndPermission('analytics:delete', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const widget = await getWidget(req, params.id);
  if (widget instanceof NextResponse) return widget;

  if (widget.userId && widget.userId !== req.userId) {
    return NextResponse.json({ error: 'Only the widget owner can delete this widget.' }, { status: 403 });
  }

  await prisma.widget.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
});
