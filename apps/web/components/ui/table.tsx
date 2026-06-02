'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TableProps {
  columns: { key: string; label: string; sortable?: boolean }[];
  data: any[];
  onSort?: (key: string) => void;
}

export function Table({ columns, data, onSort }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300"
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                {col.label}
                {col.sortable && <span className="mr-1">↕</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                لا توجد بيانات
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1 rounded border disabled:opacity-50"
      >
        <ChevronRight size={16} />
      </button>
      <span className="text-sm">
        صفحة {page} من {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1 rounded border disabled:opacity-50"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}


