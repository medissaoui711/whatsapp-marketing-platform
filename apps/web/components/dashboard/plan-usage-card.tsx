'use client';

import { Progress } from '@/components/ui';

interface PlanUsageCardProps {
  planName: string;
  currentScraped: number;
  maxScraped: number;
  currentCampaigns: number;
  maxCampaigns: number;
}

export function PlanUsageCard({
  planName,
  currentScraped,
  maxScraped,
  currentCampaigns,
  maxCampaigns,
}: PlanUsageCardProps) {
  const scrapedPercent = maxScraped === -1 ? 0 : (currentScraped / maxScraped) * 100;
  const campaignPercent = maxCampaigns === -1 ? 0 : (currentCampaigns / maxCampaigns) * 100;
  const isUnlimited = maxScraped === -1;

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold">الخطة الحالية</h2>
        <p className="text-xs text-slate-500 mt-1">{planName}</p>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>البيانات المكشوطة</span>
            <span className="text-slate-500">
              {currentScraped.toLocaleString()} / {isUnlimited ? 'غير محدود' : maxScraped.toLocaleString()}
            </span>
          </div>
          <Progress value={isUnlimited ? 0 : scrapedPercent} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>الحملات التسويقية</span>
            <span className="text-slate-500">
              {currentCampaigns} / {maxCampaigns === -1 ? 'غير محدود' : maxCampaigns}
            </span>
          </div>
          <Progress value={maxCampaigns === -1 ? 0 : campaignPercent} />
        </div>

        {scrapedPercent > 80 && !isUnlimited && (
          <div className="p-3 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
            ⚠️ لقد استهلكت {scrapedPercent.toFixed(0)}% من حصتك الشهرية.
          </div>
        )}
      </div>
    </div>
  );
}
