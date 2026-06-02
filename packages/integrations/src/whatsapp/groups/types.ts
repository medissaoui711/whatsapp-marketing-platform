export interface GroupSearchQuery {
  keyword: string;
  source?: 'google' | 'telegram' | 'github' | 'all';
  limit?: number;
  page?: number;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  description: string;
  inviteLink: string;
  source: 'google' | 'telegram' | 'github';
  category?: string;
  memberCount?: number;
  language?: string;
  isActive: boolean;
  verified: boolean;
  addedAt: Date;
}

export interface SearchResult {
  groups: WhatsAppGroup[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  searchId: string;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  inviteLink: string;
  groupName: string;
  tenantId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'joined' | 'failed';
  autoJoin: boolean;
  requestedAt: Date;
  joinedAt?: Date;
  error?: string;
  approvedAt?: Date;
}

export interface UserGroupMembership {
  id: string;
  userId: string;
  tenantId: string;
  groupId: string;
  groupName: string;
  inviteLink: string;
  joinedAt: Date;
  isActive: boolean;
  lastActiveAt?: Date;
}

export interface JoinConsent {
  userId: string;
  tenantId: string;
  consentGiven: boolean;
  consentAt: Date;
  ipAddress?: string;
}
