'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartProps {
  data: {
    labels: string[];
    contacts: number[];
    campaigns: number[];
  };
}

export function DashboardChart({ data }: ChartProps) {
  if (!data.labels.length) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-500 text-sm">
        لا توجد بيانات كافية للرسم البياني
      </div>
    );
  }

  const chartData = data.labels.map((label, index) => ({
    name: label,
    'جهات الاتصال': data.contacts[index],
    'الحملات': data.campaigns[index],
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="جهات الاتصال"
            stroke="#3B82F6"
            fill="#93C5FD"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="الحملات"
            stroke="#10B981"
            fill="#6EE7B7"
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
