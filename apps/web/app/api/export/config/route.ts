import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth/with-auth';

export const GET = withAuthAndPermission('exports:read', async () => {
  return NextResponse.json({
    tables: ['contacts'],
    contacts: {
      columns: [
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'profileName', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At' },
      ],
      filters: {
        status: ['active', 'inactive', 'blocked'],
        search: { type: 'string', label: 'Search by name' },
      },
    },
  });
});



