'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Alert, AlertDescription, Progress, toast } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeature } from '@/hooks/useFeature';

export default function EducationalMessagingPage() {
  const { check: checkFeature, loading: featureLoading, result: featureResult } = useFeature('whatsapp_educational_messaging');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    to: '',
    templateName: '',
    templateLanguage: 'ar',
    parameters: {} as Record<string, string>,
  });

  useEffect(() => {
    checkFeature();
    fetchTemplates();
    fetchQuota();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/whatsapp/templates', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل القوالب', variant: 'destructive' });
    }
  };

  const fetchQuota = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/whatsapp/quota', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setQuota(data);
    } catch {
      // quota not critical
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const paramNames = extractParamNames(template.bodyContent || '');
      setFormData(prev => ({
        ...prev,
        templateName: template.name,
        parameters: Object.fromEntries(paramNames.map((p: string) => [p, ''])),
      }));
    }
  };

  const extractParamNames = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, m => m[1].trim());
  };

  const handleSend = async () => {
    if (!featureResult?.allowed) {
      toast({
        title: 'غير مسموح',
        description: featureResult?.message || 'لا تملك صلاحية استخدام هذه الميزة',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'تم الإرسال',
          description: `تم إضافة الرسالة إلى الطابور. المتبقي اليوم: ${data.quota.remaining} من ${data.quota.limit}`,
        });
        setFormData(prev => ({ ...prev, to: '', parameters: {} }));
        fetchQuota();
      } else {
        toast({
          title: 'خطأ',
          description: data.error || data.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل إرسال الرسالة', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (featureLoading) {
    return (
      <div className="text-center py-8 text-slate-500" dir="rtl">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  if (!featureResult?.allowed) {
    return (
      <div className="text-center py-12" dir="rtl">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="text-slate-500">{featureResult?.message || 'لا تملك صلاحية استخدام هذه الميزة'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إرسال رسائل تعليمية</h1>
        <p className="text-slate-500 text-sm mt-1">
          إرسال رسائل نصية تعليمية عبر واتساب باستخدام قوالب معتمدة
        </p>
      </div>

      {quota && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>الحصة اليومية المستخدمة</span>
            <span>{quota.used} / {quota.limit}</span>
          </div>
          <Progress value={(quota.used / quota.limit) * 100} />
          <p className="text-xs text-slate-500 mt-2">
            متبقي اليوم: {quota.remaining} رسالة
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold">بيانات الرسالة</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الجوال</label>
            <Input
              placeholder="+966501234567"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">بالصيغة الدولية: +966XXXXXXXXX</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">القالب</label>
            <Select value={formData.templateName} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر قالب" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.language === 'ar' ? 'عربي' : 'English'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(formData.parameters).map((param) => (
            <div key={param}>
              <label className="block text-sm font-medium mb-1">{param}</label>
              <Input
                placeholder={`أدخل قيمة ${param}`}
                value={formData.parameters[param]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, [param]: e.target.value },
                  })
                }
              />
            </div>
          ))}

          <Button
            onClick={handleSend}
            disabled={loading || !formData.to || !formData.templateName}
            className="w-full"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">ℹ️ ملاحظات مهمة:</p>
          <ul className="text-xs list-disc list-inside mt-2 space-y-1">
            <li>يتم إرسال الرسائل عبر قوالب معتمدة من واتساب لضمان الامتثال للسياسات</li>
            <li>لا يمكن إرسال رسائل لأرقام غير مسجلة في قاعدة بيانات جهات الاتصال</li>
            <li>جميع الرسائل مسجلة في سجل التدقيق (Audit Log)</li>
            <li>الحد اليومي: {quota?.limit || 100} رسالة</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
