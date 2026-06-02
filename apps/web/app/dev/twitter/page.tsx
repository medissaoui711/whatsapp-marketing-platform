'use client';

import { useState } from 'react';

export default function TwitterScraperPage() {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<unknown>(null);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'twitter',
          type: 'profile',
          target,
          tenantId: 'demo',
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🐦 Twitter Scraper</h1>
      <p>هذه واجهة اختبار مؤقتة بدون مصادقة</p>
      <input
        type="text"
        placeholder="أدخل اسم المستخدم (مثال: @elonmusk)"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        style={{ padding: '0.5rem', width: '300px', marginLeft: '1rem' }}
      />
      <button
        onClick={handleScrape}
        disabled={loading}
        style={{ padding: '0.5rem 1rem' }}
      >
        {loading ? 'جاري الاستخراج...' : 'ابدأ'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
