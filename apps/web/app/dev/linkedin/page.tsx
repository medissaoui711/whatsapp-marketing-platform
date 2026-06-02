'use client';

import { useState } from 'react';

export default function LinkedInScraperPage() {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'linkedin',
          type: 'profile',
          target,
          tenantId: 'demo',
        }),
      });

      const data = await response.json() as Record<string, unknown>;
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', direction: 'rtl' }}>
      <h1>🔗 LinkedIn Scraper</h1>
      <p>هذه واجهة اختبار مؤقتة - يتطلب LinkedIn جلسة مصادقة</p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          اسم المستخدم في LinkedIn
        </label>
        <input
          type="text"
          placeholder="مثال: john-doe"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={{ padding: '0.5rem', width: '300px', marginLeft: '1rem', direction: 'ltr' }}
        />
        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
          أدخل الجزء بعد linkedin.com/in/
        </p>
      </div>

      <button
        onClick={handleScrape}
        disabled={loading || !target}
        style={{ padding: '0.5rem 1rem', background: loading ? '#999' : '#0a66c2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {loading ? '🔄 جاري الاستخراج...' : '🚀 بدء كشط البيانات'}
      </button>

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', fontSize: '0.85rem' }}>
        ⚠️ ملاحظة: LinkedIn يتطلب تسجيل دخول للكشط. تأكد من إضافة كوكيز الجلسة في الإعدادات.
      </div>

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>نتيجة الكشط</h2>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto', maxHeight: '400px', fontSize: '0.85rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
