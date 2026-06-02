'use client';

interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userName: string;
  createdAt: Date;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const actionIcons: Record<string, string> = {
  created: '➕',
  updated: '✏️',
  deleted: '🗑️',
};

const resourceLabels: Record<string, string> = {
  contact: 'جهة اتصال',
  campaign: 'حملة',
  message: 'رسالة',
  user: 'مستخدم',
  template: 'قالب',
  webhook: 'Webhook',
  team: 'فريق',
  widget: 'عنصر واجهة',
  scrapingJob: 'مهمة كشط',
};

function getIcon(action: string) {
  return actionIcons[action] || '📋';
}

function getResourceLabel(type: string) {
  return resourceLabels[type] || type;
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold">النشاطات الأخيرة</h2>
      </div>
      <div className="p-4">
        {activities.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">
            لا توجد نشاطات لعرضها
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                <div className="text-xl mt-0.5">
                  {getIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{activity.userName}</span>
                    <span className="text-xs text-slate-500">
                      {activity.action === 'created' ? 'أنشأ' :
                       activity.action === 'updated' ? 'حدث' :
                       activity.action === 'deleted' ? 'حذف' : activity.action}
                    </span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                      {getResourceLabel(activity.resourceType)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
