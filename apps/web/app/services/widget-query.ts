import { prisma } from '@repo/db';

export interface WidgetQueryInput {
  organizationId: string;
  dataSource: string;
  metric: string;
  field?: string;
  filters?: Array<{ field: string; operator: string; value: any }>;
  groupByField?: string;
  period?: string;
  userId?: string;
}

export interface WidgetQueryResult {
  value?: number;
  dataPoints?: Array<{ label: string; value: number; change?: number; changePercent?: number }>;
  chartData?: any;
  tableData?: any;
  total?: number;
  change?: number;
  changePercent?: number;
  period?: string;
  error?: string;
}

const SOURCE_HANDLERS: Record<string, (input: WidgetQueryInput) => Promise<WidgetQueryResult>> = {
  contacts: async (input: WidgetQueryInput) => {
    const where: any = { organizationId: input.organizationId };
    if (input.filters) {
      for (const f of input.filters) {
        if (f.field === 'assignedUserId') {
          if (f.operator === 'eq') where.assignedUserId = f.value;
          else if (f.operator === 'neq') where.assignedUserId = { not: f.value };
        } else if (f.field === 'isArchived') {
          where.isArchived = f.value === true || f.value === 'true';
        }
      }
    }
    const total = await prisma.contact.count({ where });
    const periodStart = input.period ? new Date(input.period) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const priorStart = new Date(periodStart.getTime() - (Date.now() - periodStart.getTime()));
    const recent = await prisma.contact.count({ where: { ...where, createdAt: { gte: periodStart } } });
    const prior = await prisma.contact.count({ where: { ...where, createdAt: { gte: priorStart, lt: periodStart } } });
    const change = recent - prior;
    const changePercent = prior > 0 ? Math.round((change / prior) * 100) : 0;

    if (input.metric === 'total') return { value: total, change, changePercent, period: input.period };
    if (input.metric === 'new') return { value: recent, change, changePercent, period: input.period };
    if (input.metric === 'assigned') {
      const assigned = await prisma.contact.count({ where: { ...where, assignedUserId: { not: null } } });
      return { value: assigned, total, change: assigned - total, changePercent: total > 0 ? Math.round(((assigned - total) / total) * 100) : 0 };
    }
    return { value: total, change, changePercent };
  },

  messages: async (input: WidgetQueryInput) => {
    const periodStart = input.period ? new Date(input.period) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const priorStart = new Date(periodStart.getTime() - (Date.now() - periodStart.getTime()));

    const where: any = { organizationId: input.organizationId };
    const recentWhere = { ...where, createdAt: { gte: periodStart } };
    const priorWhere = { ...where, createdAt: { gte: priorStart, lt: periodStart } };

    if (input.metric === 'total' || input.metric === 'incoming') {
      if (input.metric === 'incoming') {
        recentWhere.direction = 'inbound';
        priorWhere.direction = 'inbound';
      }
      const recent = await prisma.message.count({ where: recentWhere });
      const prior = await prisma.message.count({ where: priorWhere });
      const change = recent - prior;
      const changePercent = prior > 0 ? Math.round((change / prior) * 100) : 0;
      return { value: recent, change, changePercent, period: input.period };
    }

    if (input.metric === 'conversations') {
      const sessions = await prisma.message.groupBy({
        by: ['contactId'],
        where: { ...where, createdAt: { gte: periodStart } },
        _count: { id: true },
      });
      return { value: sessions.length, period: input.period };
    }

    return { value: 0 };
  },

  transfers: async (input: WidgetQueryInput) => {
    const periodStart = input.period ? new Date(input.period) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const where: any = { organizationId: input.organizationId };
    const recent = await prisma.transfer.count({ where: { ...where, createdAt: { gte: periodStart } } });
    const pending = await prisma.transfer.count({ where: { ...where, status: 'pending' } });
    return { value: recent, total: pending, period: input.period };
  },

  campaigns: async (input: WidgetQueryInput) => {
    const where: any = { organizationId: input.organizationId };
    const total = await prisma.campaign.count({ where });
    const active = await prisma.campaign.count({ where: { ...where, status: 'active' } });
    return { value: total, dataPoints: [{ label: 'Active', value: active }, { label: 'Inactive', value: total - active }] };
  },
};

export async function executeWidgetQuery(input: WidgetQueryInput): Promise<WidgetQueryResult> {
  const handler = SOURCE_HANDLERS[input.dataSource];
  if (!handler) {
    return { error: `Unknown data source: ${input.dataSource}` };
  }
  try {
    return await handler(input);
  } catch (err) {
    return { error: String(err) };
  }
}


