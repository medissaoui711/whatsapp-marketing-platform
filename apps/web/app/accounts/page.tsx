'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/hooks/usePermission';
import { apiClient } from '@/lib/api-client';

interface WhatsAppAccount {
  id: string;
  name: string;
  phoneId: string;
  businessId: string;
  status: string;
  isDefaultIncoming: boolean;
  isDefaultOutgoing: boolean;
  apiVersion: string;
  accessToken: string;
  appId: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const STATUS_OPTIONS = ['active', 'inactive', 'disabled'] as const;
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  disabled: 'bg-red-100 text-red-700',
};

export default function AccountsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { can } = usePermission();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phoneId: '',
    businessId: '',
    accessToken: '',
    appId: '',
    appSecret: '',
    webhookVerifyToken: '',
    apiVersion: 'v21.0',
    isDefaultIncoming: false,
    isDefaultOutgoing: false,
    autoReadReceipt: false,
    businessCallingEnabled: false,
    status: 'active' as string,
  });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await apiClient.get<PaginatedResponse<WhatsAppAccount>>('/api/accounts');
      setAccounts(res.data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => { if (user) fetchAccounts(); }, [user, fetchAccounts]);

  function openCreate() {
    setEditingId(null);
    setForm({
      name: '', phoneId: '', businessId: '', accessToken: '', appId: '',
      appSecret: '', webhookVerifyToken: '', apiVersion: 'v21.0',
      isDefaultIncoming: false, isDefaultOutgoing: false,
      autoReadReceipt: false, businessCallingEnabled: false, status: 'active',
    });
    setModalOpen(true);
  }

  function openEdit(account: WhatsAppAccount) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      phoneId: account.phoneId,
      businessId: account.businessId,
      accessToken: '',
      appId: account.appId || '',
      appSecret: '',
      webhookVerifyToken: '',
      apiVersion: account.apiVersion,
      isDefaultIncoming: account.isDefaultIncoming,
      isDefaultOutgoing: account.isDefaultOutgoing,
      autoReadReceipt: false,
      businessCallingEnabled: false,
      status: account.status,
    });
    setModalOpen(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        phoneId: form.phoneId,
        businessId: form.businessId,
        accessToken: form.accessToken,
        apiVersion: form.apiVersion,
        isDefaultIncoming: form.isDefaultIncoming,
        isDefaultOutgoing: form.isDefaultOutgoing,
        autoReadReceipt: form.autoReadReceipt,
        businessCallingEnabled: form.businessCallingEnabled,
        status: form.status,
      };
      if (form.appId) payload.appId = form.appId;

      if (editingId) {
        if (!can('accounts', 'update')) return;
        if (form.appSecret) payload.appSecret = form.appSecret;
        if (form.webhookVerifyToken) payload.webhookVerifyToken = form.webhookVerifyToken;
        await apiClient.put(`/api/accounts/${editingId}`, payload);
      } else {
        if (!can('accounts', 'create')) return;
        payload.appSecret = form.appSecret || undefined;
        payload.webhookVerifyToken = form.webhookVerifyToken || undefined;
        await apiClient.post('/api/accounts', payload);
      }

      setModalOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to save account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('accounts', 'delete')) return;
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      await apiClient.delete(`/api/accounts/${id}`);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(`/api/accounts/${id}/test`);
      alert(res.message || (res.success ? '✅ تم الاتصال بنجاح' : '❌ فشل الاتصال'));
    } catch {
      alert('❌ فشل الاتصال بالحساب');
    }
  };

  if (authLoading) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">حسابات واتساب</h1>
        {can('accounts', 'create') && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + إضافة حساب
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          لا توجد حسابات بعد. أضف حسابًا جديدًا للبدء.
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-lg border p-5 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{account.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[account.status] || 'bg-gray-100'}`}>
                      {account.status}
                    </span>
                    {account.isDefaultIncoming && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">افتراضي للواردة</span>
                    )}
                    {account.isDefaultOutgoing && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">افتراضي للصادرة</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{account.businessId} — v{account.apiVersion}</p>
                </div>
                <div className="flex items-center gap-2">
                  {can('accounts', 'update') && (
                    <>
                      <button
                        onClick={() => handleTest(account.id)}
                        className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        اختبار
                      </button>
                      <button
                        onClick={() => openEdit(account)}
                        className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        تعديل
                      </button>
                    </>
                  )}
                  {can('accounts', 'delete') && (
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="حذف"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                أُنشئ {new Date(account.createdAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'تعديل حساب واتساب' : 'إضافة حساب واتساب جديد'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الحساب</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">معرّف رقم الهاتف (Phone ID)</label>
                <input
                  type="text"
                  value={form.phoneId}
                  onChange={(e) => setForm(p => ({ ...p, phoneId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">معرّف الحساب التجاري (Business ID)</label>
                <input
                  type="text"
                  value={form.businessId}
                  onChange={(e) => setForm(p => ({ ...p, businessId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">رمز الوصول (Access Token) {editingId && <span className="text-gray-400">(اتركه فارغًا إذا لم يتغير)</span>}</label>
                <input
                  type="password"
                  value={form.accessToken}
                  onChange={(e) => setForm(p => ({ ...p, accessToken: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required={!editingId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">معرّف التطبيق (App ID)</label>
                <input
                  type="text"
                  value={form.appId}
                  onChange={(e) => setForm(p => ({ ...p, appId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">سر التطبيق (App Secret)</label>
                <input
                  type="password"
                  value={form.appSecret}
                  onChange={(e) => setForm(p => ({ ...p, appSecret: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">رمز التحقق للويبهوك (Webhook Verify Token)</label>
                <input
                  type="text"
                  value={form.webhookVerifyToken}
                  onChange={(e) => setForm(p => ({ ...p, webhookVerifyToken: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">إصدار API</label>
                  <input
                    type="text"
                    value={form.apiVersion}
                    onChange={(e) => setForm(p => ({ ...p, apiVersion: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحالة</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isDefaultIncoming}
                    onChange={(e) => setForm(p => ({ ...p, isDefaultIncoming: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">حساب افتراضي للرسائل الواردة</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isDefaultOutgoing}
                    onChange={(e) => setForm(p => ({ ...p, isDefaultOutgoing: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">حساب افتراضي للرسائل الصادرة</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.autoReadReceipt}
                    onChange={(e) => setForm(p => ({ ...p, autoReadReceipt: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">إشعار قراءة تلقائي</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.businessCallingEnabled}
                    onChange={(e) => setForm(p => ({ ...p, businessCallingEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">تفعيل الاتصال التجاري</span>
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg dark:border-gray-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? 'حفظ التغييرات' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


