'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/hooks/usePermission';
import { apiClient } from '@/lib/api-client';

interface Integration {
  id: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
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

const INTEGRATION_TYPES = ['whatsapp', 'telegram', 'webhook', 'email'] as const;

const LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp Business API',
  telegram: 'Telegram Bot API',
  webhook: 'Webhook',
  email: 'SMTP Email',
};

const ICONS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '📱',
  webhook: '🔗',
  email: '📧',
};

export default function IntegrationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { can } = usePermission();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [configFields, setConfigFields] = useState<Record<string, string>>({});

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await apiClient.get<PaginatedResponse<Integration>>('/api/integrations');
      setIntegrations(res.data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => { if (user) fetchIntegrations(); }, [user, fetchIntegrations]);

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!can('integrations', 'update')) return;
    try {
      await apiClient.put(`/api/integrations/${id}`, { enabled: !enabled });
      fetchIntegrations();
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!can('integrations', 'delete')) return;
    if (!confirm('هل أنت متأكد من حذف هذا التكامل؟')) return;
    try {
      await apiClient.delete(`/api/integrations/${id}`);
      fetchIntegrations();
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('integrations', 'create')) return;
    try {
      const config: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(configFields)) {
        if (value.trim()) {
          config[key] = key === 'port' ? parseInt(value) || value : value;
        }
      }
      await apiClient.post('/api/integrations', { type: selectedType, config, enabled: true });
      setModalOpen(false);
      setSelectedType('');
      setConfigFields({});
      fetchIntegrations();
    } catch (error) {
      console.error('Failed to add integration:', error);
    }
  };

  const getConfigFieldsForType = (type: string): { key: string; label: string; type: string }[] => {
    switch (type) {
      case 'whatsapp':
        return [
          { key: 'apiKey', label: 'API Key', type: 'password' },
          { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' },
          { key: 'businessAccountId', label: 'Business Account ID', type: 'text' },
        ];
      case 'telegram':
        return [
          { key: 'botToken', label: 'Bot Token', type: 'password' },
          { key: 'chatId', label: 'Chat ID', type: 'text' },
        ];
      case 'webhook':
        return [
          { key: 'url', label: 'Webhook URL', type: 'url' },
          { key: 'secret', label: 'Secret', type: 'password' },
        ];
      case 'email':
        return [
          { key: 'host', label: 'SMTP Host', type: 'text' },
          { key: 'port', label: 'Port', type: 'number' },
          { key: 'user', label: 'Username', type: 'text' },
          { key: 'pass', label: 'Password', type: 'password' },
          { key: 'from', label: 'From Email', type: 'email' },
        ];
      default:
        return [];
    }
  };

  if (authLoading) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">التكاملات والقنوات</h1>
        {can('integrations', 'create') && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + إضافة تكامل
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          لا توجد تكاملات بعد. أضف تكاملًا جديدًا للبدء.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="bg-white rounded-lg border p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ICONS[integration.type] || '🔌'}</span>
                  <h3 className="font-semibold capitalize">{LABELS[integration.type] || integration.type}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {can('integrations', 'update') && (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={integration.enabled}
                        onChange={() => handleToggle(integration.id, integration.enabled)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                  {can('integrations', 'delete') && (
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="حذف"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {Object.entries(integration.config).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="truncate">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(integration.createdAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4">إضافة تكامل جديد</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع التكامل</label>
                <select
                  value={selectedType}
                  onChange={(e) => { setSelectedType(e.target.value); setConfigFields({}); }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                >
                  <option value="">اختر النوع</option>
                  {INTEGRATION_TYPES.map((t) => (
                    <option key={t} value={t}>{LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {selectedType && getConfigFieldsForType(selectedType).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={configFields[field.key] || ''}
                    onChange={(e) => setConfigFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    required={field.key !== 'secret' && field.key !== 'businessAccountId' && field.key !== 'chatId'}
                  />
                </div>
              ))}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setModalOpen(false); setConfigFields({}); }} className="px-4 py-2 border rounded-lg dark:border-gray-600">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


