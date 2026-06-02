'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Alert, AlertDescription } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface GroupMembership {
  id: string;
  groupName: string;
  groupId: string;
  inviteLink: string;
  joinedAt: string;
  isActive: boolean;
}

interface PendingRequest {
  id: string;
  groupName: string;
  groupId: string;
  inviteLink: string;
  requestedAt: string;
  status: string;
}

export function GroupJoin() {
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [joinForm, setJoinForm] = useState({
    groupId: '',
    inviteLink: '',
    groupName: '',
    autoJoin: false,
  });

  const getToken = () => localStorage.getItem('accessToken');

  const apiHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  useEffect(() => {
    fetchData();
    checkConsent();
  }, []);

  const fetchData = async () => {
    const res = await fetch('/api/whatsapp/groups/memberships', { headers: apiHeaders() });
    const data = await res.json();
    if (res.ok) {
      setMemberships(data.memberships || []);
      setPendingRequests(data.pendingRequests || []);
    }
  };

  const checkConsent = async () => {
    const res = await fetch('/api/whatsapp/groups/consent', { headers: apiHeaders() });
    const data = await res.json();
    if (res.ok) setHasConsent(data.hasConsent);
  };

  const recordConsent = async () => {
    const res = await fetch('/api/whatsapp/groups/consent', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ consent: true }),
    });
    if (res.ok) {
      setHasConsent(true);
      setShowConsentDialog(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!hasConsent) {
      setShowConsentDialog(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/groups/join', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(joinForm),
      });

      const data = await res.json();
      if (res.ok) {
        alert('تم إرسال طلب الانضمام بنجاح');
        setJoinForm({ groupId: '', inviteLink: '', groupName: '', autoJoin: false });
        fetchData();
      } else {
        alert(data.error || 'فشل طلب الانضمام');
      }
    } catch {
      alert('حدث خطأ أثناء طلب الانضمام');
    } finally {
      setLoading(false);
    }
  };

  const approveJoin = async (requestId: string) => {
    const res = await fetch(`/api/whatsapp/groups/join/${requestId}/approve`, {
      method: 'POST',
      headers: apiHeaders(),
    });
    if (res.ok) fetchData();
  };

  const leaveGroup = async (membershipId: string) => {
    if (!confirm('هل أنت متأكد من مغادرة هذه المجموعة؟')) return;
    const res = await fetch(`/api/whatsapp/groups/memberships/${membershipId}`, {
      method: 'DELETE',
      headers: apiHeaders(),
    });
    if (res.ok) fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge>قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="secondary">تمت الموافقة</Badge>;
      case 'joined':
        return <Badge variant="outline">انضممت</Badge>;
      case 'rejected':
        return <Badge>مرفوض</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🛡️ موافقة على سياسة الانضمام</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                قبل الانضمام إلى مجموعات واتساب، يرجى قراءة والموافقة على الشروط التالية:
              </AlertDescription>
            </Alert>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>لن يتم الانضمام تلقائياً إلى أي مجموعة بدون موافقتك الصريحة</li>
              <li>المنصة غير مسؤولة عن محتوى المجموعات التي تنضم إليها</li>
              <li>يمكنك مغادرة أي مجموعة في أي وقت</li>
              <li>سيتم تسجيل المجموعات التي تنضم إليها في سجل التدقيق</li>
            </ul>
            <Button onClick={recordConsent} className="w-full">
              أوافق وأريد المتابعة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold">طلب الانضمام إلى مجموعة</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم المجموعة</label>
            <Input
              placeholder="مثال: مجموعة تسويق رقمي"
              value={joinForm.groupName}
              onChange={(e) => setJoinForm({ ...joinForm, groupName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رابط دعوة المجموعة</label>
            <Input
              placeholder="https://chat.whatsapp.com/..."
              value={joinForm.inviteLink}
              onChange={(e) => setJoinForm({ ...joinForm, inviteLink: e.target.value })}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">معرف المجموعة (اختياري)</label>
            <Input
              placeholder="معرف فريد للمجموعة"
              value={joinForm.groupId}
              onChange={(e) => setJoinForm({ ...joinForm, groupId: e.target.value })}
            />
          </div>

          <Button
            onClick={handleJoinRequest}
            disabled={loading || !joinForm.groupName || !joinForm.inviteLink}
            className="w-full"
          >
            {loading ? 'جاري...' : 'طلب الانضمام'}
          </Button>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold">طلبات الانضمام المعلقة</h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex justify-between items-center p-3 bg-slate-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium">{request.groupName}</p>
                  <p className="text-xs text-slate-500">
                    طلب في: {new Date(request.requestedAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {getStatusBadge(request.status)}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(request.inviteLink, '_blank')}
                  >
                    فتح
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {memberships.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold">المجموعات التي انضممت إليها</h2>
          </div>
          <div className="p-4 space-y-3">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div>
                  <p className="font-medium">{membership.groupName}</p>
                  <p className="text-xs text-slate-500">
                    انضممت في: {new Date(membership.joinedAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">عضو نشط</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(membership.inviteLink, '_blank')}
                  >
                    فتح
                  </Button>
                  <Button size="sm" onClick={() => leaveGroup(membership.id)}>
                    مغادرة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Alert>
        <AlertDescription>
          <p className="text-sm">🔒 أمان وخصوصية:</p>
          <ul className="text-xs list-disc list-inside mt-2 space-y-1">
            <li>لن ننضم تلقائياً إلى أي مجموعة بدون موافقتك الصريحة</li>
            <li>يمكنك مراجعة المجموعة قبل اتخاذ قرار الانضمام</li>
            <li>يمكنك مغادرة أي مجموعة في أي وقت</li>
            <li>يتم تسجيل جميع المجموعات التي تنضم إليها لأغراض أمنية</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
