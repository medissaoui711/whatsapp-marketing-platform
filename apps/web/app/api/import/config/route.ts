import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth/with-auth';

export const GET = withAuthAndPermission('imports:read', async () => {
  return NextResponse.json({
    tables: ['contacts'],
    contacts: {
      columns: ['phoneNumber', 'profileName', 'status'],
      columnMapping: {
        'Phone Number': 'phoneNumber',
        'Name': 'profileName',
        'Status': 'status',
      },
      supportedFormats: ['csv'],
      maxFileSize: '5MB',
    },
  });
});



