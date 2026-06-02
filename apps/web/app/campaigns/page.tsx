import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@repo/db';
import { verifyRefreshToken } from '@repo/auth';
import { CampaignsManager } from '@/components/campaigns/campaigns-manager';
import type { CampaignItem } from '@/lib/types/campaign';

const PAGE_SIZE = 20;

async function getTenantId(): Promise<string | null> {
  const store = cookies();
  const access = store.get('whm_access')?.value;
  const refresh = store.get('whm_refresh')?.value;

  if (access) {
    const { verifyAccessToken } = await import('@repo/auth');
    const p = verifyAccessToken(access);
    if (p) return p.tenantId || p.organizationId || null;
  }
  if (refresh) {
    const p = verifyRefreshToken(refresh);
    if (p) return p.tenantId || p.organizationId || null;
  }
  return null;
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string };
}) {
  const tenantId = await getTenantId();
  if (!tenantId) redirect('/login');

  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const search = searchParams.search || '';
  const statusFilter = searchParams.status || '';

  const where: Record<string, unknown> = { organizationId: tenantId };
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (statusFilter) {
    where.status = statusFilter;
  }

  const [campaigns, total, templates, whatsappAccounts] = await Promise.all([
    prisma.bulkMessageCampaign.findMany({
      where,
      include: {
        template: { select: { name: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bulkMessageCampaign.count({ where }),
    prisma.template.findMany({
      where: { organizationId: tenantId },
      select: { id: true, name: true, bodyContent: true },
      orderBy: { name: 'asc' },
    }),
    prisma.whatsAppAccount.findMany({
      where: { organizationId: tenantId },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const initialCampaigns: CampaignItem[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    whatsappAccount: c.whatsappAccount,
    templateId: c.templateId,
    templateName: c.template?.name ?? null,
    status: c.status as CampaignItem['status'],
    totalRecipients: c.totalRecipients,
    sentCount: c.sentCount,
    deliveredCount: c.deliveredCount,
    readCount: c.readCount,
    failedCount: c.failedCount,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    startedAt: c.startedAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    createdByName: c.creator?.fullName ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.name,
    bodyContent: t.bodyContent,
  }));

  const accountOptions = whatsappAccounts.map((a) => ({
    name: a.name,
  }));

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">الحملات التسويقية</h1>
        <p className="text-slate-500 text-sm mt-1">إنشاء وإدارة حملات الرسائل الجماعية عبر WhatsApp</p>
      </div>

      <CampaignsManager
        initialCampaigns={initialCampaigns}
        initialPagination={{ page, pageSize: PAGE_SIZE, total, totalPages }}
        templates={templateOptions}
        whatsappAccounts={accountOptions}
      />
    </div>
  );
}


