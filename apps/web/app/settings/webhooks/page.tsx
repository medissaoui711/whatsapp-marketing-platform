'use client';

import { useState, useEffect, useCallback } from 'react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  hasSecret: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryLog {
  id: string;
  webhookId: string;
  webhookName: string;
  success: boolean;
  errorMessage: string | null;
  responseCode: number | null;
  sentAt: string;
}

interface WebhookEventInfo {
  value: string;
  label: string;
  labelAr: string;
}

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deliveriesWebhookId, setDeliveriesWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setWebhooks(data.data || []);
    } catch (e) {
      console.error('Failed to fetch webhooks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks/events');
      const data = await res.json();
      setEvents(data.data || []);
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
    fetchEvents();
  }, [fetchWebhooks, fetchEvents]);

  const fetchDeliveries = async (webhookId: string) => {
    setDeliveriesWebhookId(webhookId);
    setDeliveriesLoading(true);
    try {
      const res = await fetch(`/api/webhooks/delivery-logs?webhookId=${webhookId}`);
      const data = await res.json();
      setDeliveries(data.data || []);
    } catch {
      setDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (formData.events.length === 0) {
      setFormError('يرجى اختيار حدث واحد على الأقل');
      return;
    }
    setFormSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: formData.name,
        url: formData.url,
        events: formData.events,
      };
      if (formData.secret) body.secret = formData.secret;

      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setCreateOpen(false);
        setFormData({ name: '', url: '', events: [], secret: '' });
        fetchWebhooks();
      } else {
        const err = await res.json();
        setFormError(err.error?.[0]?.message || err.error || 'فشل الإنشاء');
      }
    } catch {
      setFormError('خطأ في الاتصال بالخادم');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    setToggling(webhook.id);
    try {
      await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });
      fetchWebhooks();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الـ Webhook؟')) return;
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (deliveriesWebhookId === id) setDeliveriesWebhookId(null);
      fetchWebhooks();
    } catch (e) {
      console.error('Failed to delete webhook', e);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      setTimeout(() => {
        if (deliveriesWebhookId === id) fetchDeliveries(id);
      }, 2000);
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(value)
        ? prev.events.filter((e) => e !== value)
        : [...prev.events, value],
    }));
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const eventLabel = (value: string) => {
    const ev = events.find((e) => e.value === value);
    return ev?.labelAr || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">إعدادات Webhooks</h1>
          <p className="text-slate-500 text-sm mt-1">
            استقبال الأحداث الفورية من المنصة إلى تطبيقاتك الخارجية
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + إضافة Webhook
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-lg border">
          <p className="text-lg mb-2">لا توجد Webhooks</p>
          <p className="text-sm">أضف Webhook لاستقبال الأحداث من المنصة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-white rounded-lg border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{webhook.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      webhook.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {webhook.isActive ? 'نشط' : 'معطل'}
                    </span>
                    {webhook.hasSecret && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">موقّع</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-mono mt-1 truncate ltr text-left">
                    {webhook.url}
                  </p>
                </div>
                <div className="flex gap-1 mr-3 shrink-0">
                  <button
                    onClick={() => handleToggle(webhook)}
                    disabled={toggling === webhook.id}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      webhook.isActive
                        ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {toggling === webhook.id ? '...' : webhook.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testing === webhook.id}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    {testing === webhook.id ? '...' : 'اختبار'}
                  </button>
                  <button
                    onClick={() => fetchDeliveries(webhook.id)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    السجل
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {webhook.events.map((evt) => (
                  <span key={evt} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {eventLabel(evt)}
                  </span>
                ))}
              </div>

              {deliveriesWebhookId === webhook.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">سجل الإرسال</h4>
                  {deliveriesLoading ? (
                    <p className="text-xs text-slate-500">جاري التحميل...</p>
                  ) : deliveries.length === 0 ? (
                    <p className="text-xs text-slate-500">لا توجد محاولات إرسال</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {deliveries.map((dl) => (
                        <div key={dl.id} className="flex items-center gap-3 text-xs bg-slate-50 rounded px-3 py-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            dl.success ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-slate-500">{formatDate(dl.sentAt)}</span>
                          <span className={`font-mono ${dl.success ? 'text-green-600' : 'text-red-600'}`}>
                            {dl.responseCode || '-'}
                          </span>
                          {dl.errorMessage && (
                            <span className="text-red-500 truncate">{dl.errorMessage}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold">إضافة Webhook جديد</h2>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: إشعارات Slack"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endpoint URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://your-server.com/webhook"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ltr text-left"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المفتاح السري (اختياري)</label>
                <input
                  type="text"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="HMAC secret للتوقيع"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ltr text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الأحداث *</label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {events.map((evt) => (
                    <label key={evt.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded p-1.5">
                      <input
                        type="checkbox"
                        checked={formData.events.includes(evt.value)}
                        onChange={() => toggleEvent(evt.value)}
                        className="rounded border-slate-300"
                      />
                      <span>{evt.labelAr}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {formSubmitting ? 'جاري الإنشاء...' : 'إنشاء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
