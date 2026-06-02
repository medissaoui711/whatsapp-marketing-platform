'use client';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  change?: number;
  suffix?: string;
}

export function StatsCard({ title, value, icon, change, suffix }: StatsCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold">
        {value}{suffix && <span className="text-sm font-normal mr-1 text-slate-500">{suffix}</span>}
      </div>
      {change !== undefined && (
        <p className={`text-xs mt-1 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-500'}`}>
          {isPositive ? '▲' : isNegative ? '▼' : ''} {Math.abs(change).toFixed(1)}%
          <span className="text-slate-500 mr-1">مقارنة بالشهر الماضي</span>
        </p>
      )}
    </div>
  );
}
