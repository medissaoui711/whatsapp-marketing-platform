'use client';

import { useState, useCallback } from 'react';
import { CampaignsTable } from './campaigns-table';
import { CampaignsFilters } from './campaigns-filters';
import { CampaignsPagination } from './campaigns-pagination';
import { CreateCampaignDialog } from './create-campaign-dialog';
import type { CampaignItem, TemplateOption, WhatsAppAccountOption } from '@/lib/types/campaign';

interface CampaignsManagerProps {
  initialCampaigns: CampaignItem[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
  templates: TemplateOption[];
  whatsappAccounts: WhatsAppAccountOption[];
}

export function CampaignsManager({ initialCampaigns, initialPagination, templates, whatsappAccounts }: CampaignsManagerProps) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [pagination, setPagination] = useState(initialPagination);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const res = await fetch(`/api/campaigns?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCampaigns(data.campaigns);
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        totalPages: Math.ceil(data.total / prev.pageSize),
      }));
    }
  }, []);

  return (
    <>
      <CampaignsFilters onOpenCreate={() => setDialogOpen(true)} />

      <CampaignsTable campaigns={campaigns} onRefresh={refresh} />

      <CampaignsPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        pageSize={pagination.pageSize}
      />

      <CreateCampaignDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => { setDialogOpen(false); refresh(); }}
        templates={templates}
        whatsappAccounts={whatsappAccounts}
      />
    </>
  );
}
