import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@repo/db';
import { verifyRefreshToken } from '@repo/auth';
import { ContactsTable } from '@/components/contacts/contacts-table';
import { ContactsFilters } from '@/components/contacts/contacts-filters';
import { ContactsPagination } from '@/components/contacts/contacts-pagination';
import { CreateContactDialog } from '@/components/contacts/create-contact-dialog';
import type { ContactItem, ContactsResponse } from '@/lib/types/contact';

const PAGE_SIZE = 20;

async function getTenantId(): Promise<string | null> {
  const store = cookies();
  const access = store.get('whm_access')?.value;
  const refresh = store.get('whm_refresh')?.value;

  if (access) {
    const { verifyAccessToken } = await import('@repo/auth');
    const p = verifyAccessToken(access);
    if (p) return p.tenantId || p.organizationId || null;
  }
  if (refresh) {
    const p = verifyRefreshToken(refresh);
    if (p) return p.tenantId || p.organizationId || null;
  }
  return null;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; tag?: string };
}) {
  const tenantId = await getTenantId();
  if (!tenantId) redirect('/login');

  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const search = searchParams.search || '';
  const tagFilter = searchParams.tag || '';

  const where: Record<string, unknown> = { organizationId: tenantId };
  if (search) {
    where.OR = [
      { profileName: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }) as unknown as ContactItem[],
    prisma.contact.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  let filtered = contacts;
  if (tagFilter) {
    filtered = contacts.filter((c) =>
      Array.isArray(c.tags) && (c.tags as string[]).includes(tagFilter)
    );
  }

  const allTags = await prisma.tag.findMany({
    where: { organizationId: tenantId },
    orderBy: { name: 'asc' },
  });

  const availableTags = [...new Set([
    ...allTags.map((t) => t.name),
    ...contacts.flatMap((c) => Array.isArray(c.tags) ? c.tags as string[] : []),
  ])];

  const data: ContactsResponse = {
    contacts: filtered.map((c) => ({
      id: c.id,
      profileName: c.profileName || null,
      phoneNumber: c.phoneNumber,
      whatsappAccount: c.whatsappAccount || null,
      tags: Array.isArray(c.tags) ? c.tags as string[] : [],
      assignedUserId: c.assignedUserId || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages },
    filters: { search },
    availableTags,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">جهات الاتصال</h1>
        <p className="text-slate-500 text-sm mt-1">إدارة جهات الاتصال المستوردة من عمليات الكشط والبيانات المرفوعة يدوياً</p>
      </div>

      <ContactsFilters
        availableTags={data.availableTags}
        onOpenCreate={() => {}}
      />

      <ContactsTable
        contacts={data.contacts}
        onRefresh={async () => {}}
      />

      <ContactsPagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
        total={data.pagination.total}
        pageSize={data.pagination.pageSize}
      />
    </div>
  );
}
