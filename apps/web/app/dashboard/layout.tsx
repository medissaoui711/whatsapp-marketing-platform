import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@repo/db';
import { verifyRefreshToken } from '@repo/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { ToastProvider } from '@/components/ui';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const accessCookie = cookieStore.get('whm_access')?.value;
  const refreshCookie = cookieStore.get('whm_refresh')?.value;

  const tokenPayload = accessCookie
    ? null
    : refreshCookie
      ? verifyRefreshToken(refreshCookie)
      : null;

  if (!accessCookie && !refreshCookie) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      fullName: true,
      isSuperAdmin: true,
      roleId: true,
    },
    orderBy: { lastLoginAt: 'desc' },
    take: 1,
  });

  if (!user) {
    redirect('/login');
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.fullName,
    role: user.isSuperAdmin ? 'super_admin' : (tokenPayload?.role || 'agent'),
    tenantId: tokenPayload?.tenantId || tokenPayload?.organizationId || '',
    isSuperAdmin: user.isSuperAdmin,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" dir="rtl">
      <DashboardSidebar user={authUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <ToastProvider>
            {children}
          </ToastProvider>
        </main>
      </div>
    </div>
  );
}
