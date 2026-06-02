'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';

interface ContactsFiltersProps {
  availableTags: string[];
  onOpenCreate: () => void;
}

export function ContactsFilters({ availableTags, onOpenCreate }: ContactsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') || '';
  const currentTag = searchParams.get('tag') || '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/contacts?${params.toString()}`);
  };

  const clearFilters = () => router.push('/contacts');

  const hasFilters = currentSearch || currentTag;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={currentSearch}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <select
        value={currentTag}
        onChange={(e) => updateFilter('tag', e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">جميع العلامات</option>
        {availableTags.map((tag) => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>

      {hasFilters && (
        <Button variant="secondary" onClick={clearFilters}>
          مسح الكل
        </Button>
      )}

      <Button onClick={onOpenCreate}>
        + إضافة جهة اتصال
      </Button>
    </div>
  );
}
