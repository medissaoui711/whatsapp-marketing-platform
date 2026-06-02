'use client';

interface ChangeDetailsProps {
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    isChange: boolean;
  }>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatFieldLabel(field: string): string {
  if (!field) return '';
  return field
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ChangeDetails({ changes }: ChangeDetailsProps) {
  if (!changes.length) {
    return <div className="text-gray-500 text-sm">لم يتم تسجيل أي تغييرات</div>;
  }

  return (
    <div className="space-y-2">
      {changes.map((change, idx) => (
        <div key={idx} className="border-b pb-2 last:border-0">
          <div className="font-medium text-sm">{formatFieldLabel(change.field)}</div>
          <div className="flex gap-2 text-sm mt-1">
            <div className="flex-1">
              <span className="text-gray-500">قبل:</span>
              <div className="bg-red-50 p-1 rounded text-red-700">
                {formatValue(change.oldValue)}
              </div>
            </div>
            <div className="flex-1">
              <span className="text-gray-500">بعد:</span>
              <div className="bg-green-50 p-1 rounded text-green-700">
                {formatValue(change.newValue)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


