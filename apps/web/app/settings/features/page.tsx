'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface Feature {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  settings: any;
  usageCount: number;
  lastUsedAt: string | null;
}

const categoryIcons: Record<string, string> = {
  messaging: '💬',
  groups: '👥',
  scraping: '🕷️',
  whatsapp: '📱',
};

const categoryNames: Record<string, string> = {
  messaging: 'الرسائل',
  groups: 'المجموعات',
  scraping: 'الكشط',
  whatsapp: 'واتساب',
};

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export default function FeaturesPage() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setFetching(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/features', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setFeatures(data.features || []);
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الميزات', variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  const toggleFeature = async (featureId: string, isActive: boolean) => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/features/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ featureId, isActive }),
      });

      if (res.ok) {
        toast({
          title: 'تم التحديث',
          description: `تم ${isActive ? 'تفعيل' : 'تعطيل'} الميزة بنجاح`,
        });
        fetchFeatures();
      } else {
        toast({ title: 'خطأ', description: 'فشل تحديث الميزة', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحديث الميزة', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (featureId: string, settings: any) => {
    const token = getAccessToken();
    const res = await fetch('/api/features/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ featureId, settings }),
    });

    if (res.ok) {
      toast({ title: 'تم التحديث', description: 'تم حفظ الإعدادات بنجاح' });
      fetchFeatures();
    }
  };

  const groupedFeatures = features.reduce(
    (acc, feature) => {
      if (!acc[feature.category]) acc[feature.category] = [];
      acc[feature.category].push(feature);
      return acc;
    },
    {} as Record<string, Feature[]>
  );

  if (fetching) {
    return (
      <div className="space-y-8" dir="rtl">
        <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إدارة الأدوات والميزات</h1>
        <p className="text-slate-500 text-sm mt-1">
          تفعيل أو تعطيل الأدوات المتاحة لمؤسستك والتحكم في إعداداتها
        </p>
      </div>

      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{categoryIcons[category] || '📦'}</span>
            <h2 className="text-xl font-semibold">{categoryNames[category] || category}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryFeatures.map((feature) => (
              <div
                key={feature.id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{feature.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                    </div>
                    <Switch
                      checked={feature.isActive}
                      onCheckedChange={(checked) => toggleFeature(feature.id, checked)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {feature.usageCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">عدد مرات الاستخدام:</span>
                      <Badge variant="secondary">{feature.usageCount}</Badge>
                    </div>
                  )}

                  {feature.isActive && feature.settings && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3">
                      <h4 className="text-sm font-medium">الإعدادات</h4>

                      {feature.settings.dailyLimit !== undefined && (
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-sm">الحد اليومي</label>
                          <input
                            type="number"
                            defaultValue={feature.settings.dailyLimit}
                            className="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-transparent"
                            onBlur={(e) =>
                              updateSettings(feature.id, {
                                ...feature.settings,
                                dailyLimit: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      )}

                      {feature.settings.maxGroupsPerDay !== undefined && (
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-sm">الحد الأقصى للمجموعات يومياً</label>
                          <input
                            type="number"
                            defaultValue={feature.settings.maxGroupsPerDay}
                            className="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-transparent"
                            onBlur={(e) =>
                              updateSettings(feature.id, {
                                ...feature.settings,
                                maxGroupsPerDay: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      )}

                      {feature.settings.rateLimit !== undefined && (
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-sm">عدد الطلبات في الدقيقة</label>
                          <input
                            type="number"
                            defaultValue={feature.settings.rateLimit}
                            className="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-transparent"
                            onBlur={(e) =>
                              updateSettings(feature.id, {
                                ...feature.settings,
                                rateLimit: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ℹ️ <strong>ملاحظة:</strong> بعض الأدوات تخضع لسياسات المنصة. يرجى مراجعة شروط
          الاستخدام قبل تفعيل أدوات الكشط أو الانضمام التلقائي للمجموعات.
        </p>
      </div>
    </div>
  );
}
