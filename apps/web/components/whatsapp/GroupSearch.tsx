'use client';

import { useState } from 'react';
import { Button, Input, Alert, AlertDescription } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface WhatsAppGroup {
  id: string;
  name: string;
  description: string;
  inviteLink: string;
  source: string;
  category?: string;
  memberCount?: number;
  verified: boolean;
}

export function GroupSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WhatsAppGroup[]>([]);
  const [searchInfo, setSearchInfo] = useState<{ total: number; searchId: string } | null>(null);
  const [formData, setFormData] = useState({
    keyword: '',
    source: 'all',
    limit: 20,
  });

  const handleSearch = async () => {
    if (!formData.keyword.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/whatsapp/groups/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results.groups);
        setSearchInfo({
          total: data.results.total,
          searchId: data.results.searchId,
        });
      } else {
        alert(data.error || 'فشل البحث');
      }
    } catch {
      alert('حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('تم نسخ رابط المجموعة');
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google': return '🔍';
      case 'telegram': return '✈️';
      case 'github': return '🐙';
      default: return '🌐';
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'google': return 'Google';
      case 'telegram': return 'Telegram';
      case 'github': return 'GitHub';
      default: return source;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold">البحث عن مجموعات واتساب</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">كلمة البحث</label>
              <Input
                placeholder="مثال: تسويق رقمي, برمجة, تعليم..."
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="w-48">
              <label className="block text-sm font-medium mb-1">مصدر البحث</label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData({ ...formData, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المصادر</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button onClick={handleSearch} disabled={loading || !formData.keyword}>
                {loading ? 'جاري...' : 'بحث'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              نتائج البحث: {searchInfo?.total} مجموعة
            </h3>
            <p className="text-xs text-slate-500">معرف البحث: {searchInfo?.searchId}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {results.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getSourceIcon(group.source)}</span>
                        <h3 className="font-bold text-lg">{group.name}</h3>
                        {group.verified && <Badge>موثوق</Badge>}
                        {group.category && <Badge variant="secondary">{group.category}</Badge>}
                      </div>

                      <p className="text-slate-600 text-sm mb-3">{group.description}</p>

                      <div className="flex gap-4 text-sm text-slate-500">
                        {group.memberCount && <span>👥 {group.memberCount} عضو</span>}
                        <span>المصدر: {getSourceName(group.source)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mr-4">
                      <Button variant="secondary" size="sm" onClick={() => copyInviteLink(group.inviteLink)}>
                        نسخ الرابط
                      </Button>
                      <Button size="sm" onClick={() => window.open(group.inviteLink, '_blank')}>
                        فتح
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {results.length === 0 && !loading && formData.keyword && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-12 text-center">
            <p className="text-slate-500">لا توجد نتائج مطابقة لبحثك</p>
            <p className="text-sm text-slate-400 mt-2">حاول استخدام كلمات بحث مختلفة</p>
          </div>
        </div>
      )}

      <Alert>
        <AlertDescription>
          <p className="text-sm">⚠️ تنبيه مهم:</p>
          <ul className="text-xs list-disc list-inside mt-2 space-y-1">
            <li>المنصة لا تتحمل مسؤولية محتوى المجموعات أو الروابط المنشورة</li>
            <li>يرجى التحقق من صحة المجموعة قبل الانضمام</li>
            <li>لا تنضم تلقائياً للمجموعات دون موافقتك</li>
            <li>يمكنك الإبلاغ عن روابط غير مناسبة عبر دعم المنصة</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
