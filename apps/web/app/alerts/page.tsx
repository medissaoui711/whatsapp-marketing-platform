'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
  resolved: boolean;
}

export default function AlertsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', type: 'warning', title: 'رصيد API منخفض', message: 'رصيد واتساب API أقل من 1000 رسالة متبقية', createdAt: new Date().toISOString(), resolved: false },
    { id: '2', type: 'error', title: 'فشل تكامل', message: 'فشل اتصال Telegram Bot API منذ 5 دقائق', createdAt: new Date().toISOString(), resolved: false },
  ]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, []);

  const handleResolve = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  const getIcon = (type: string) => { switch (type) { case 'error': return '❌'; case 'warning': return '⚠️'; default: return 'ℹ️'; } };
  const getBgColor = (type: string) => { switch (type) { case 'error': return 'bg-red-50 border-red-200'; case 'warning': return 'bg-yellow-50 border-yellow-200'; default: return 'bg-blue-50 border-blue-200'; } };

  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  if (!mounted) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">مركز التنبيهات</h1>
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">{activeAlerts.length} تنبيه نشط</span>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">التنبيهات النشطة</h2>
        {activeAlerts.map((alert) => (
          <div key={alert.id} className={`p-4 rounded-lg border ${getBgColor(alert.type)}`}>
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <span className="text-xl">{getIcon(alert.type)}</span>
                <div>
                  <h3 className="font-semibold">{alert.title}</h3>
                  <p className="text-sm mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(alert.createdAt).toLocaleString('ar-SA')}</p>
                </div>
              </div>
              <button onClick={() => handleResolve(alert.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">حل</button>
            </div>
          </div>
        ))}
        {activeAlerts.length === 0 && <div className="text-center py-8 text-gray-500">🎉 لا توجد تنبيهات نشطة</div>}
      </div>

      {resolvedAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">التنبيهات السابقة</h2>
          {resolvedAlerts.map((alert) => (
            <div key={alert.id} className="p-4 rounded-lg border bg-gray-50 opacity-60">
              <div className="flex gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <h3 className="font-semibold">{alert.title}</h3>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


