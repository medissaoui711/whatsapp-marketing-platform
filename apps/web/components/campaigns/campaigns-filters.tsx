'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';

interface CampaignsFiltersProps {
  onOpenCreate: () => void;
}

const statusOptions = [
  { value: '', label: 'جميع الحالات' },
  { value: 'draft', label: 'مسودة' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'processing', label: 'قيد التنفيذ' },
  { value: 'paused', label: 'متوقفة مؤقتاً' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغاة' },
  { value: 'failed', label: 'فاشلة' },
];

export function CampaignsFilters({ onOpenCreate }: CampaignsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') || '';
  const currentStatus = searchParams.get('status') || '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/campaigns?${params.toString()}`);
  };

  const clearFilters = () => router.push('/campaigns');

  const hasFilters = currentSearch || currentStatus;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="بحث باسم الحملة..."
          value={currentSearch}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <select
        value={currentStatus}
        onChange={(e) => updateFilter('status', e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {hasFilters && (
        <Button variant="secondary" onClick={clearFilters}>
          مسح الكل
        </Button>
      )}

      <Button onClick={onOpenCreate}>
        + حملة جديدة
      </Button>
    </div>
  );
}
