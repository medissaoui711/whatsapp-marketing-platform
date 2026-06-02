'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/hooks/usePermission';
import { Button, Input } from '@/components/ui';

interface BusinessProfile {
  messagingProduct?: string;
  address?: string;
  description?: string;
  vertical?: string;
  email?: string;
  websites?: string[];
  profilePictureUrl?: string;
  about?: string;
}

export default function BusinessProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { can } = usePermission();

  const [account, setAccount] = useState<{ id: string; name: string } | null>(null);
  const [profile, setProfile] = useState<BusinessProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    about: '',
    address: '',
    description: '',
    email: '',
    vertical: '',
    websites: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchAccount = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/accounts/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAccount(data.account || data);
    }
  }, [params.id, token]);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${params.id}/business-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('فشل في جلب ملف الأعمال التجاري');
      const data = await res.json();
      setProfile(data);
      setFormData({
        about: data.about || '',
        address: data.address || '',
        description: data.description || '',
        email: data.email || '',
        vertical: data.vertical || '',
        websites: data.websites?.join(', ') || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [params.id, token]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchAccount();
      fetchProfile();
    }
  }, [fetchAccount, fetchProfile, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        about: formData.about,
        address: formData.address,
        description: formData.description,
        email: formData.email,
        vertical: formData.vertical,
        websites: formData.websites.split(',').map(s => s.trim()).filter(s => s),
      };

      const res = await fetch(`/api/accounts/${params.id}/business-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('فشل في تحديث ملف الأعمال التجاري');

      const data = await res.json();
      if (data.message) {
        setSuccess(data.message);
      } else {
        setProfile(data);
        setSuccess('تم تحديث ملف الأعمال التجاري بنجاح');
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('يُسمح فقط بصور JPEG و PNG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الملف يجب أن يكون أقل من 5 ميغابايت');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/accounts/${params.id}/profile-picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('فشل في رفع الصورة');
      const data = await res.json();
      setSuccess(data.message);
      fetchProfile();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!confirm('هل أنت متأكد من إزالة صورة الملف الشخصي؟')) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${params.id}/profile-picture`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('فشل في إزالة الصورة');
      const data = await res.json();
      setSuccess(data.message);
      fetchProfile();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return null;

  if (!can('accounts', 'update')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ليس لديك صلاحية لإدارة ملف الأعمال التجاري
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">ملف الأعمال التجاري</h1>
          <p className="text-sm text-gray-500 mt-1">
            {account?.name || 'حساب واتساب'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">صورة الملف الشخصي</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
            {profile.profilePictureUrl ? (
              <img src={profile.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="block">
              <span className="sr-only">اختر صورة</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
            {profile.profilePictureUrl && (
              <button onClick={handleRemovePicture} disabled={uploading} className="text-sm text-red-600 hover:text-red-700">
                إزالة الصورة
              </button>
            )}
            {uploading && <p className="text-sm text-gray-500">جاري الرفع...</p>}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">معلومات الأعمال</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900 dark:text-green-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">عنوان النشاط التجاري</label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="مثال: 123 شارع الأعمال، المدينة" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="business@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">القطاع</label>
                <select value={formData.vertical} onChange={(e) => setFormData({ ...formData, vertical: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="">اختر القطاع</option>
                  <option value="RETAIL">تجزئة</option>
                  <option value="EDU">تعليم</option>
                  <option value="HEALTHCARE">رعاية صحية</option>
                  <option value="HOSPITALITY">ضيافة</option>
                  <option value="REAL_ESTATE">عقارات</option>
                  <option value="TRAVEL">سفر</option>
                  <option value="FINANCE">تمويل</option>
                  <option value="AUTOMOTIVE">سيارات</option>
                  <option value="ENTERTAINMENT">ترفيه</option>
                  <option value="NON_PROFIT">غير ربحي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">مواقع الويب</label>
                <Input value={formData.websites} onChange={(e) => setFormData({ ...formData, websites: e.target.value })} placeholder="https://example.com, https://shop.example.com" />
                <p className="text-xs text-gray-500 mt-1">افصل بين المواقع بفواصل</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">نبذة عن النشاط التجاري</label>
                <textarea value={formData.about} onChange={(e) => setFormData({ ...formData, about: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700" placeholder="وصف مختصر للنشاط التجاري" />
                <p className="text-xs text-gray-500 mt-1">الحد الأقصى 139 حرفاً</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">وصف النشاط التجاري</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700" placeholder="وصف مفصل للنشاط التجاري والخدمات المقدمة" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>حفظ التغييرات</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
