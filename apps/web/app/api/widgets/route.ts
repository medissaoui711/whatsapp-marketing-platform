import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { widgetSchema } from '@repo/shared/src/schemas/widget';

export const GET = withAuthAndPermission('analytics:read', async (req: NextRequest) => {
  const where: any = {
    organizationId: req.organizationId,
  };

  if (req.userId) {
    where.OR = [
      { userId: req.userId },
      { isShared: true },
    ];
  }

  const widgets = await prisma.widget.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
  });

  return NextResponse.json({
    data: widgets.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      dataSource: w.dataSource,
      metric: w.metric,
      field: w.field,
      filters: w.filters,
      displayType: w.displayType,
      chartType: w.chartType,
      groupByField: w.groupByField,
      showChange: w.showChange,
      color: w.color,
      size: w.size,
      displayOrder: w.displayOrder,
      gridX: w.gridX,
      gridY: w.gridY,
      gridW: w.gridW,
      gridH: w.gridH,
      config: w.config,
      isShared: w.isShared,
      isDefault: w.isDefault,
      userId: w.userId,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
});

export const POST = withAuthAndPermission('analytics:write', async (req: NextRequest) => {
  const body = await req.json();
  const parsed = widgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const maxOrder = await prisma.widget.aggregate({
    where: { organizationId: req.organizationId, userId: req.userId },
    _max: { displayOrder: true },
  });

  const defaults: Record<string, { w: number; h: number }> = {
    number: { w: 3, h: 3 },
    chart: { w: 6, h: 5 },
    table: { w: 6, h: 8 },
    shortcuts: { w: 6, h: 8 },
  };

  const size = defaults[parsed.data.displayType] || { w: 3, h: 3 };

  const widget = await prisma.widget.create({
    data: {
      organizationId: req.organizationId,
      userId: req.userId,
      name: parsed.data.name,
      description: parsed.data.description,
      dataSource: parsed.data.dataSource,
      metric: parsed.data.metric,
      field: parsed.data.field,
      filters: parsed.data.filters,
      displayType: parsed.data.displayType,
      chartType: parsed.data.chartType,
      groupByField: parsed.data.groupByField,
      showChange: parsed.data.showChange,
      color: parsed.data.color,
      size: parsed.data.size,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      gridW: size.w,
      gridH: size.h,
      isShared: parsed.data.isShared,
    },
  });

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
  }, { status: 201 });
});



