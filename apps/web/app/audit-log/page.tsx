'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { Pagination } from '@/components/ui';

interface AuditLog {
  id: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'deleted';
  changes: any[];
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  created: 'إنشاء',
  updated: 'تعديل',
  deleted: 'حذف',
};

const actionColors: Record<string, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  updated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const resourceLabels: Record<string, string> = {
  contact: 'جهة اتصال',
  campaign: 'حملة',
  integration: 'تكامل',
  user: 'مستخدم',
  account: 'حساب واتساب',
  settings: 'إعدادات',
  transfer: 'تحويل',
  agentTransfer: 'تحويل وكيل',
  chatbotSession: 'جلسة محادثة',
  chatbotSettings: 'إعدادات المحادثة',
  whatsappAccount: 'حساب واتساب',
  auditLog: 'سجل تدقيق',
};

export default function AuditLogPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (resourceType) params.set('resourceType', resourceType);
      if (action) params.set('action', action);
      if (userId) params.set('userId', userId);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError('ليس لديك صلاحية لعرض سجل النشاطات');
        return;
      }
      if (!res.ok) throw new Error('فشل في تحميل سجل النشاطات');

      const data = await res.json();
      setLogs(data.auditLogs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [page, limit, resourceType, action, userId, fromDate, toDate]);

  useEffect(() => {
    if (mounted) fetchLogs();
  }, [page, fetchLogs, mounted]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setResourceType('');
    setAction('');
    setUserId('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  if (!mounted) return null;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">سجل النشاطات</h1>
          <p className="text-sm text-gray-500 mt-1">
            تتبع جميع التغييرات والإجراءات في المنصة
          </p>
        </div>
        <div className="text-sm text-gray-500">
          إجمالي {total} سجل
        </div>
      </div>

      <Card title="">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">نوع المورد</label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">الكل</option>
              {Object.entries(resourceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الإجراء</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">الكل</option>
              <option value="created">إنشاء</option>
              <option value="updated">تعديل</option>
              <option value="deleted">حذف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">معرف المستخدم</label>
            <Input
              type="text"
              placeholder="معرف المستخدم"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">من تاريخ</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={handleReset}>إعادة تعيين</Button>
            <Button onClick={handleSearch}>بحث</Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <Card title="">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">المستخدم</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">نوع المورد</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">الإجراء</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">التغييرات</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">معرف المورد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      لا توجد سجلات
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm">
                        {new Date(log.createdAt).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{log.userName}</div>
                        <div className="text-xs text-gray-500">{log.userId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {resourceLabels[log.resourceType] || log.resourceType}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${actionColors[log.action]}`}>
                          {actionLabels[log.action]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.changes.length > 0 ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600">عرض التغييرات</summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto max-w-xs">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-500">
                          {log.resourceId.slice(0, 12)}...
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}


