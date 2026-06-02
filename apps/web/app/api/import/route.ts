import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { importRequestSchema, ImportResult } from '@repo/shared/src/schemas/export-import';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('imports:create', async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const columnMappingRaw = formData.get('columnMapping');
  const updateOnDuplicate = formData.get('updateOnDuplicate') === 'true';

  if (!file) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  let columnMapping: Record<string, string> | undefined;
  if (columnMappingRaw && typeof columnMappingRaw === 'string') {
    try { columnMapping = JSON.parse(columnMappingRaw); } catch { /* ignore */ }
  }

  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: 'File must have a header row and at least one data row.' }, { status: 400 });
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const defaultMapping: Record<string, string> = {
    'Phone Number': 'phoneNumber',
    'Name': 'profileName',
    'Status': 'status',
  };
  const mapping = columnMapping || defaultMapping;

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: 0, messages: [] };

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

    try {
      const phoneNumber = row[Object.keys(mapping).find(k => mapping[k] === 'phoneNumber') || '']?.replace(/\D/g, '');
      if (!phoneNumber) { result.skipped++; continue; }

      const profileName = row[Object.keys(mapping).find(k => mapping[k] === 'profileName') || ''] || 'Imported';

      const existing = await prisma.contact.findFirst({
        where: { organizationId: req.organizationId, phoneNumber },
      });

      if (existing) {
        if (updateOnDuplicate) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: { profileName },
          });
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        await prisma.contact.create({
          data: {
            organizationId: req.organizationId,
            phoneNumber,
            profileName,
            status: 'active',
          },
        });
        result.created++;
      }
    } catch (err: any) {
      result.errors++;
      result.messages.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  await logAudit(req.userId, req.userName, 'import', 'contacts', 'create', result, req.organizationId);

  return NextResponse.json(result);
});

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}



