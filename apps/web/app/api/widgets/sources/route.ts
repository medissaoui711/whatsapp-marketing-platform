import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth/with-auth';

const AVAILABLE_SOURCES = [
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Contact statistics and metrics',
    metrics: [
      { id: 'total', name: 'Total Contacts', type: 'number' },
      { id: 'new', name: 'New Contacts', type: 'number' },
      { id: 'assigned', name: 'Assigned Contacts', type: 'number' },
    ],
    fields: ['assignedUserId', 'isArchived'],
    operators: ['eq', 'neq'],
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Message volume and trends',
    metrics: [
      { id: 'total', name: 'Total Messages', type: 'number' },
      { id: 'incoming', name: 'Incoming Messages', type: 'number' },
      { id: 'conversations', name: 'Active Conversations', type: 'number' },
    ],
    fields: ['direction', 'contactId'],
    operators: ['eq', 'neq'],
  },
  {
    id: 'transfers',
    name: 'Transfers',
    description: 'Transfer activity and pending items',
    metrics: [
      { id: 'total', name: 'Total Transfers', type: 'number' },
      { id: 'pending', name: 'Pending Transfers', type: 'number' },
    ],
    fields: ['status', 'assignedToId'],
    operators: ['eq', 'neq'],
  },
  {
    id: 'campaigns',
    name: 'Campaigns',
    description: 'Campaign performance',
    metrics: [
      { id: 'total', name: 'Total Campaigns', type: 'number' },
      { id: 'active', name: 'Active Campaigns', type: 'number' },
    ],
    fields: ['status'],
    operators: ['eq'],
  },
];

export const GET = withAuthAndPermission('analytics:read', async () => {
  return NextResponse.json({ data: AVAILABLE_SOURCES });
});



