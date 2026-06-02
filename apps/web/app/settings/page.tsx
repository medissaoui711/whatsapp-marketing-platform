'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TenantSettings {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  settings: { primaryColor?: string; timezone?: string; logo?: string };
}

export default function SettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', settings: { primaryColor: '#3b82f6', timezone: 'Asia/Riyadh' } });

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, []);

  useEffect(() => { if (mounted) fetchSettings(); }, [mounted]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSettings(data);
      setFormData({
        name: data.name,
        settings: { primaryColor: data.settings?.primaryColor || '#3b82f6', timezone: data.settings?.timezone || 'Asia/Riyadh' },
      });
    } catch (error) { console.error('Failed to fetch settings:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('حدث خطأ في حفظ الإعدادات');
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">إعدادات المؤسسة</h1>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">اسم المؤسسة</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full max-w-md px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اللون الأساسي</label>
              <input type="color" value={formData.settings.primaryColor} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, primaryColor: e.target.value } })} className="w-20 h-10 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المنطقة الزمنية</label>
              <select value={formData.settings.timezone} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, timezone: e.target.value } })} className="w-full max-w-md px-3 py-2 border rounded-lg">
                <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                <option value="Asia/Dubai">دبي (GMT+4)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">حفظ الإعدادات</button>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold mb-2">معلومات المؤسسة</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>المعرف: {settings?.id}</p>
              <p>Subdomain: {settings?.subdomain}</p>
              <p>الخطة: {settings?.plan === 'basic' ? 'أساسية' : settings?.plan === 'pro' ? 'احترافية' : 'مؤسسات'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


