'use client';

import { useState, useCallback } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';

interface ScrapeJob {
  id: string;
  target: string;
  type: string;
  platform: string;
  status: string;
  progress: number;
  resultsCount: number;
  createdAt: string;
}

export default function MonitoringDashboard() {
  const [jobs, setJobs] = useState<Map<string, ScrapeJob>>(new Map());
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const handleEvent = useCallback((event: Record<string, unknown>) => {
    const eventData = event.payload as Record<string, unknown> || event;
    const jobId = (eventData.jobId || event.jobId) as string;
    const timestamp = (eventData.timestamp || event.timestamp) as string;

    setJobs((prev) => {
      const next = new Map(prev);
      const existing = next.get(jobId);

      switch (event.type || (eventData.type as string)) {
        case 'SCRAPE_STARTED':
        case 'scrape_started': {
          const d = eventData.data as Record<string, unknown> || {};
          next.set(jobId, {
            id: jobId,
            target: (d.target || '') as string,
            type: (d.type || 'profile') as string,
            platform: (d.platform || 'linkedin') as string,
            status: 'running',
            progress: 0,
            resultsCount: 0,
            createdAt: timestamp || new Date().toISOString(),
          });
          break;
        }
        case 'SCRAPE_PROGRESS':
        case 'scrape_progress':
          if (existing) {
            existing.progress = (eventData.data as Record<string, number>)?.progress ?? existing.progress;
            next.set(jobId, existing);
          }
          break;
        case 'SCRAPE_COMPLETED':
        case 'scrape_completed':
          if (existing) {
            existing.status = 'completed';
            existing.progress = 100;
            existing.resultsCount = ((eventData.data as Record<string, number>)?.resultsCount) ?? 1;
            next.set(jobId, existing);
          }
          break;
        case 'SCRAPE_FAILED':
        case 'scrape_failed':
          if (existing) {
            existing.status = 'failed';
            next.set(jobId, existing);
          }
          break;
      }

      return next;
    });
  }, []);

  const connected = useWebSocket('ws://localhost:3001', (event) => {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      handleEvent(data);
    } catch {
      // ignore parse errors
    }
  });

  const startScrape = async () => {
    const target = prompt('أدخل اسم المستخدم في LinkedIn (مثال: john-doe)');
    if (!target) return;

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

    await response.json();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; label: string }> = {
      running: { bg: '#fef3cd', label: '🔄 قيد التنفيذ' },
      completed: { bg: '#d4edda', label: '✅ مكتمل' },
      failed: { bg: '#f8d7da', label: '❌ فشل' },
    };
    const s = styles[status] || { bg: '#e2e3e5', label: status };
    return <span style={{ background: s.bg, padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{s.label}</span>;
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', direction: 'rtl' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>📊 لوحة مراقبة الكشط</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '12px', height: '12px', borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
          }} />
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            {connected ? 'متصل بالتحديثات المباشرة' : 'غير متصل'}
          </span>
        </div>
      </div>

      <button
        onClick={startScrape}
        style={{
          marginBottom: '1.5rem', padding: '0.5rem 1rem', background: '#0a66c2', color: '#fff',
          border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem',
        }}
      >
        🚀 بدء كشط جديد
      </button>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {Array.from(jobs.values()).map((job) => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job.id === selectedJob ? null : job.id)}
            style={{
              padding: '1rem', background: '#fff', border: `2px solid ${selectedJob === job.id ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div>
                <strong>{job.platform === 'linkedin' ? '🔗' : '🌐'} {job.type === 'profile' ? 'ملف شخصي' : 'بحث'}</strong>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>@ {job.target}</p>
              </div>
              {statusBadge(job.status)}
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>التقدم</span>
                <span>{job.progress}%</span>
              </div>
              <div style={{
                width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${job.progress}%`, height: '100%',
                  background: job.status === 'failed' ? '#ef4444' : '#3b82f6',
                  borderRadius: '4px', transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#999' }}>
              <span>📅 {new Date(job.createdAt).toLocaleTimeString('ar')}</span>
              {job.resultsCount > 0 && <span>📊 {job.resultsCount} نتيجة</span>}
            </div>
          </div>
        ))}

        {jobs.size === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999' }}>
            <p>لا توجد مهام كشط حالياً</p>
            <p style={{ fontSize: '0.85rem' }}>ابدأ مهمة جديدة بالضغط على الزر أعلاه</p>
          </div>
        )}
      </div>
    </div>
  );
}
