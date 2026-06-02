import { z } from 'zod';

export const dashboardStatsSchema = z.object({
  totalMessages: z.number(),
  totalContacts: z.number(),
  totalChatbotSessions: z.number(),
  totalCampaigns: z.number(),
  activeCampaigns: z.number(),
  messagesSent: z.number(),
  messagesReceived: z.number(),
  messagesChange: z.number(),
  contactsChange: z.number(),
  chatbotSessionsChange: z.number(),
  campaignsChange: z.number(),
  recentMessages: z.array(z.object({
    id: z.string(),
    contactId: z.string(),
    contactName: z.string().nullable(),
    phoneNumber: z.string(),
    content: z.string().nullable(),
    direction: z.enum(['incoming', 'outgoing']),
    messageType: z.string(),
    sentByUserName: z.string().nullable(),
    createdAt: z.string(),
  })),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const agentPerformanceSchema = z.object({
  agentId: z.string(),
  agentName: z.string().nullable(),
  email: z.string(),
  isAvailable: z.boolean(),
  totalTransfersHandled: z.number(),
  activeTransfers: z.number(),
  avgResolutionTimeMins: z.number(),
  avgQueueTimeMins: z.number(),
  transfersToday: z.number(),
  breakTimeMins: z.number(),
});

export type AgentPerformanceStats = z.infer<typeof agentPerformanceSchema>;

export const trendPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export type TrendPoint = z.infer<typeof trendPointSchema>;

export const agentAnalyticsSchema = z.object({
  summary: z.object({
    totalAgents: z.number(),
    availableAgents: z.number(),
    onBreakAgents: z.number(),
    totalTransfersHandled: z.number(),
    avgResolutionTimeMins: z.number(),
    avgQueueTimeMins: z.number(),
    activeTransfers: z.number(),
  }),
  agents: z.array(agentPerformanceSchema),
  trends: z.object({
    transfersOverTime: z.array(trendPointSchema),
    resolutionTimeOverTime: z.array(trendPointSchema),
    queueTimeOverTime: z.array(trendPointSchema),
  }),
});

export type AgentAnalyticsResponse = z.infer<typeof agentAnalyticsSchema>;

export const agentDetailSchema = z.object({
  agentId: z.string(),
  agentName: z.string().nullable(),
  email: z.string(),
  isAvailable: z.boolean(),
  performance: z.object({
    totalTransfersHandled: z.number(),
    activeTransfers: z.number(),
    avgResolutionTimeMins: z.number(),
    avgQueueTimeMins: z.number(),
    transfersToday: z.number(),
    transfersThisWeek: z.number(),
    transfersThisMonth: z.number(),
    breakTimeTodayMins: z.number(),
    breakTimeThisWeekMins: z.number(),
    breakTimeThisMonthMins: z.number(),
    slaBreachedCount: z.number(),
    escalationCount: z.number(),
  }),
  recentTransfers: z.array(z.object({
    id: z.string(),
    contactId: z.string(),
    contactPhone: z.string(),
    status: z.string(),
    transferredAt: z.string(),
    resolvedAt: z.string().nullable(),
    resolutionTimeMins: z.number(),
    queueTimeMins: z.number(),
    slaBreached: z.boolean(),
  })),
  trends: z.object({
    transfersOverTime: z.array(trendPointSchema),
    resolutionTimeOverTime: z.array(trendPointSchema),
  }),
});

export type AgentDetailResponse = z.infer<typeof agentDetailSchema>;

export const agentComparisonSchema = z.object({
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  agents: z.array(z.object({
    agentId: z.string(),
    agentName: z.string().nullable(),
    transfersHandled: z.number(),
    avgResolutionTimeMins: z.number(),
    avgQueueTimeMins: z.number(),
    slaBreachedCount: z.number(),
    escalationCount: z.number(),
    breakTimeMins: z.number(),
    busiestDay: z.string().nullable(),
  })),
});

export type AgentComparisonResponse = z.infer<typeof agentComparisonSchema>;

export const metaAnalyticsQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  analyticsType: z.enum(['analytics', 'pricing_analytics', 'template_analytics', 'call_analytics']),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format'),
  granularity: z.enum(['HALF_HOUR', 'DAY', 'MONTH']).optional().default('DAY'),
  templateIds: z.string().optional(),
});

export type MetaAnalyticsQuery = z.infer<typeof metaAnalyticsQuerySchema>;

export interface MetaAnalyticsResponse {
  accountId: string;
  accountName: string;
  data: {
    analytics?: {
      granularity: string;
      dataPoints: Array<{
        start: number;
        end: number;
        sent: number;
        delivered: number;
      }>;
    };
    pricingAnalytics?: {
      granularity: string;
      dataPoints: Array<{
        start: number;
        end: number;
        volume: number;
        cost: number;
        country?: string;
        pricingCategory?: string;
        pricingType?: string;
      }>;
    };
    templateAnalytics?: {
      granularity: string;
      dataPoints: Array<{
        templateId: string;
        start: number;
        end: number;
        sent: number;
        delivered: number;
        read: number;
        cost?: Array<{ type: string; value: number }>;
        clicked?: Array<{ type: string; buttonContent: string; count: number }>;
      }>;
    };
    callAnalytics?: {
      granularity: string;
      dataPoints: Array<{
        start: number;
        end: number;
        count: number;
        cost: number;
        averageDuration: number;
        direction?: string;
      }>;
    };
  };
  templateNames?: Record<string, string>;
}


