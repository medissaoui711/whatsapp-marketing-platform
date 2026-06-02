'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';

interface ContactsPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function ContactsPagination({ currentPage, totalPages, total, pageSize }: ContactsPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/contacts?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <div className="text-slate-500">
        عرض {start} - {end} من {total} جهة اتصال
      </div>

      <div className="flex gap-1 items-center">
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
        >
          ⏮
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ▶
        </Button>

        <span className="px-3 py-1 text-slate-600">
          صفحة {currentPage} من {totalPages}
        </span>

        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          ◀
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          ⏭
        </Button>
      </div>
    </div>
  );
}
