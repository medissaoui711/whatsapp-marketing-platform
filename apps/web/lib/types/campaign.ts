export interface CampaignItem {
  id: string;
  name: string;
  whatsappAccount: string;
  templateId: string;
  templateName: string | null;
  status: 'draft' | 'scheduled' | 'queued' | 'processing' | 'paused' | 'completed' | 'cancelled' | 'failed';
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignsResponse {
  campaigns: CampaignItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
    status?: string;
  };
}

export interface TemplateOption {
  id: string;
  name: string;
  bodyContent: string;
}

export interface WhatsAppAccountOption {
  name: string;
}
