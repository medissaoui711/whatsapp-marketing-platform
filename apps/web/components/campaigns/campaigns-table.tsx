'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CampaignItem } from '@/lib/types/campaign';

interface CampaignsTableProps {
  campaigns: CampaignItem[];
  onRefresh: () => void;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  scheduled: 'مجدولة',
  queued: 'في قائمة الانتظار',
  processing: 'قيد التنفيذ',
  paused: 'متوقفة مؤقتاً',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  failed: 'فشلت',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-yellow-100 text-yellow-700',
  queued: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  paused: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

export function CampaignsTable({ campaigns, onRefresh }: CampaignsTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleDelete = async (campaignId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحملة؟')) return;
    setDeleting(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  const handleAction = async (campaignId: string, action: string) => {
    setActionLoading(`${campaignId}:${action}`);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/${action}`, { method: 'POST' });
      if (res.ok) setTimeout(onRefresh, 1000);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });

  const progressPercent = (campaign: CampaignItem) => {
    if (campaign.totalRecipients === 0) return 0;
    return Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100);
  };

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-right p-3 font-medium text-slate-600">الاسم</th>
              <th className="text-right p-3 font-medium text-slate-600">الحالة</th>
              <th className="text-right p-3 font-medium text-slate-600">القالب</th>
              <th className="text-right p-3 font-medium text-slate-600">التقدم</th>
              <th className="text-right p-3 font-medium text-slate-600">التاريخ</th>
              <th className="text-center p-3 font-medium text-slate-600 w-40">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  لا توجد حملات لعرضها
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium">{campaign.name}</td>
                  <td className="p-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${statusColors[campaign.status] || statusColors.draft}`}>
                      {statusLabels[campaign.status] || campaign.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{campaign.templateName || '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            campaign.status === 'failed' ? 'bg-red-500' :
                            campaign.status === 'completed' ? 'bg-green-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${progressPercent(campaign)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 min-w-[4rem] text-left" dir="ltr">
                        {campaign.sentCount + campaign.failedCount}/{campaign.totalRecipients}
                      </span>
                    </div>
                    {campaign.failedCount > 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        {campaign.failedCount} فشل
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {formatDate(campaign.createdAt)}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {campaign.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleAction(campaign.id, 'start')}
                            disabled={campaign.totalRecipients === 0 || actionLoading === `${campaign.id}:start`}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === `${campaign.id}:start` ? '...' : 'إرسال'}
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            disabled={deleting === campaign.id}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            {deleting === campaign.id ? '...' : 'حذف'}
                          </button>
                        </>
                      )}
                      {campaign.status === 'processing' && (
                        <button
                          onClick={() => handleAction(campaign.id, 'pause')}
                          disabled={actionLoading === `${campaign.id}:pause`}
                          className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                          {actionLoading === `${campaign.id}:pause` ? '...' : 'إيقاف'}
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => handleAction(campaign.id, 'start')}
                          disabled={actionLoading === `${campaign.id}:start`}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === `${campaign.id}:start` ? '...' : 'استئناف'}
                        </button>
                      )}
                      {(campaign.status === 'paused' || campaign.status === 'completed' || campaign.status === 'failed') && (
                        <>
                          {campaign.failedCount > 0 && (
                            <button
                              onClick={() => handleAction(campaign.id, 'retry')}
                              disabled={actionLoading === `${campaign.id}:retry`}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {actionLoading === `${campaign.id}:retry` ? '...' : 'إعادة المحاولة'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            disabled={deleting === campaign.id}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            {deleting === campaign.id ? '...' : 'حذف'}
                          </button>
                        </>
                      )}
                      {(campaign.status === 'processing' || campaign.status === 'queued' || campaign.status === 'scheduled') && (
                        <button
                          onClick={() => handleAction(campaign.id, 'cancel')}
                          disabled={actionLoading === `${campaign.id}:cancel`}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          {actionLoading === `${campaign.id}:cancel` ? '...' : 'إلغاء'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
