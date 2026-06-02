import { z } from 'zod';

export const widgetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  dataSource: z.string().min(1, 'Data source is required'),
  metric: z.string().min(1, 'Metric is required'),
  field: z.string().optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'between', 'dateRange']),
    value: z.any(),
  })).optional().default([]),
  displayType: z.enum(['number', 'chart', 'table', 'shortcuts']).default('number'),
  chartType: z.enum(['line', 'bar', 'area', 'pie', 'doughnut']).optional(),
  groupByField: z.string().optional(),
  showChange: z.boolean().optional().default(true),
  color: z.string().optional(),
  size: z.enum(['small', 'medium', 'large']).default('small'),
  isShared: z.boolean().optional().default(false),
});

export const widgetLayoutSchema = z.object({
  widgets: z.array(z.object({
    id: z.string(),
    gridX: z.number().int().min(0),
    gridY: z.number().int().min(0),
    gridW: z.number().int().min(1).max(12),
    gridH: z.number().int().min(1).max(12),
  })),
});

export const filterInputSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.any(),
});

export interface WidgetResponse {
  id: string;
  name: string;
  description: string | null;
  dataSource: string;
  metric: string;
  field: string | null;
  filters: any[];
  displayType: string;
  chartType: string | null;
  groupByField: string | null;
  showChange: boolean;
  color: string | null;
  size: string;
  displayOrder: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  config: any;
  isShared: boolean;
  isDefault: boolean;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  color?: string;
}

export interface DataPoint {
  label: string;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface GroupedSeriesData {
  series: Array<{ name: string; data: ChartPoint[] }>;
  total: number;
}

export interface TableRow {
  [key: string]: any;
}

export interface WidgetDataResponse {
  value?: number;
  dataPoints?: DataPoint[];
  chartData?: ChartPoint[] | GroupedSeriesData;
  tableData?: TableRow[];
  total?: number;
  change?: number;
  changePercent?: number;
  period?: string;
  error?: string;
}


