'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import type { TemplateOption, WhatsAppAccountOption } from '@/lib/types/campaign';

interface CreateCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  templates: TemplateOption[];
  whatsappAccounts: WhatsAppAccountOption[];
}

export function CreateCampaignDialog({ open, onClose, onSuccess, templates, whatsappAccounts }: CreateCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const templateId = form.get('templateId') as string;
    const whatsappAccount = form.get('whatsappAccount') as string;
    const scheduledAt = form.get('scheduledAt') as string;

    if (!name) {
      setError('اسم الحملة مطلوب');
      setLoading(false);
      return;
    }

    if (!templateId) {
      setError('يرجى اختيار قالب');
      setLoading(false);
      return;
    }

    if (!whatsappAccount) {
      setError('يرجى اختيار حساب WhatsApp');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          templateId,
          whatsappAccount,
          scheduledAt: scheduledAt || undefined,
        }),
      });

      if (res.ok) {
        onClose();
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || data.details?.[0]?.message || 'حدث خطأ أثناء الإنشاء');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold">حملة جديدة</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <Input
            label="اسم الحملة *"
            name="name"
            placeholder="مثال: حملة العروض الشتوية"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              حساب WhatsApp *
            </label>
            <select
              name="whatsappAccount"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">اختر حساباً</option>
              {whatsappAccounts.map((acc) => (
                <option key={acc.name} value={acc.name}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              قالب الرسالة *
            </label>
            <select
              name="templateId"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">اختر قالباً</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="جدولة الإرسال (اختياري)"
            name="scheduledAt"
            type="datetime-local"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
