'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';

interface CreateContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateContactDialog({ open, onClose, onSuccess }: CreateContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const profileName = form.get('profileName') as string;
    const phoneNumber = form.get('phoneNumber') as string;
    const whatsappAccount = form.get('whatsappAccount') as string;
    const tagsStr = form.get('tags') as string;

    if (!phoneNumber) {
      setError('رقم الهاتف مطلوب');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileName: profileName || null,
          phoneNumber,
          whatsappAccount: whatsappAccount || null,
          tags: tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        }),
      });

      if (res.ok) {
        onClose();
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'حدث خطأ أثناء الإضافة');
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
          <h2 className="text-lg font-semibold">إضافة جهة اتصال جديدة</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <Input
            label="رقم الهاتف *"
            name="phoneNumber"
            type="tel"
            placeholder="+966501234567"
            required
            dir="ltr"
          />

          <Input
            label="الاسم"
            name="profileName"
            placeholder="مثال: أحمد محمد"
          />

          <Input
            label="حساب WhatsApp"
            name="whatsappAccount"
            placeholder="مثال: 966501234567"
            dir="ltr"
          />

          <Input
            label="العلامات (مفصولة بفواصل)"
            name="tags"
            placeholder="مثال: vip, عميل, جديد"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
