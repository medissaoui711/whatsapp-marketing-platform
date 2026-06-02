import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { exportRequestSchema } from '@repo/shared/src/schemas/export-import';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('exports:create', async (req: NextRequest) => {
  const body = await req.json();
  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { table, columns, filters, format } = parsed.data;

  if (table !== 'contacts') {
    return NextResponse.json({ error: 'Only contacts export is supported.' }, { status: 400 });
  }

  const where: any = { organizationId: req.organizationId };
  if (filters?.search) where.profileName = { contains: filters.search };
  if (filters?.status) where.status = filters.status;

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const allowedColumns = columns || ['phoneNumber', 'profileName', 'status', 'createdAt'];
  const rows = contacts.map(c => {
    const row: Record<string, any> = {};
    for (const col of allowedColumns) {
      row[col] = (c as any)[col] ?? '';
    }
    return row;
  });

  await logAudit(req.userId, req.userName, 'export', 'contacts', 'create', { count: rows.length, format }, req.organizationId);

  if (format === 'json') {
    return NextResponse.json({ data: rows, total: rows.length });
  }

  const header = allowedColumns.join(',');
  const csvRows = rows.map(r => allowedColumns.map(c => {
    const val = String(r[c] ?? '');
    return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(','));
  const csv = [header, ...csvRows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="contacts-${Date.now()}.csv"`,
    },
  });
});



