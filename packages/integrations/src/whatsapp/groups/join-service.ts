import { prisma } from '@repo/db';
import { logAudit, generateChanges } from '@repo/audit';
import { groupSearchService } from './search-service';
import type { GroupJoinRequest, UserGroupMembership, JoinConsent } from './types';

export class GroupJoinService {
  async requestJoin(
    tenantId: string,
    userId: string,
    userName: string,
    groupId: string,
    inviteLink: string,
    groupName: string,
    autoJoin: boolean = false
  ): Promise<GroupJoinRequest> {
    const validation = await groupSearchService.validateInviteLink(inviteLink);
    if (!validation.isValid) {
      throw new Error('Invalid WhatsApp group invite link');
    }

    const existingRequest = await prisma.groupJoinRequest.findFirst({
      where: {
        tenantId,
        userId,
        groupId,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existingRequest) {
      throw new Error('You already have a pending join request for this group');
    }

    const existingMembership = await prisma.userGroupMembership.findFirst({
      where: { tenantId, userId, groupId, isActive: true },
    });

    if (existingMembership) {
      throw new Error('You are already a member of this group');
    }

    const joinRequest = await prisma.groupJoinRequest.create({
      data: {
        tenantId,
        userId,
        groupId,
        inviteLink,
        groupName,
        autoJoin,
        status: 'pending',
        requestedAt: new Date(),
      },
    });

    await logAudit(
      userId,
      userName,
      'group_join_request',
      joinRequest.id,
      'created',
      [{ field: 'action', oldValue: null, newValue: 'GROUP_JOIN_REQUESTED' }],
      tenantId
    );

    return joinRequest as unknown as GroupJoinRequest;
  }

  async approveJoinRequest(
    requestId: string,
    tenantId: string,
    userId: string,
    userName: string
  ): Promise<UserGroupMembership> {
    const joinRequest = await prisma.groupJoinRequest.findFirst({
      where: { id: requestId, tenantId, userId, status: 'pending' },
    });

    if (!joinRequest) {
      throw new Error('Join request not found or already processed');
    }

    await prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: 'approved', approvedAt: new Date() },
    });

    const membership = await prisma.userGroupMembership.create({
      data: {
        tenantId,
        userId,
        groupId: joinRequest.groupId,
        groupName: joinRequest.groupName,
        inviteLink: joinRequest.inviteLink,
        joinedAt: new Date(),
        isActive: true,
      },
    });

    await logAudit(
      userId,
      userName,
      'group_membership',
      membership.id,
      'created',
      [{ field: 'action', oldValue: null, newValue: 'GROUP_JOINED' }],
      tenantId
    );

    return membership as unknown as UserGroupMembership;
  }

  async rejectJoinRequest(
    requestId: string,
    tenantId: string,
    userId: string,
    userName: string,
    reason?: string
  ): Promise<void> {
    await prisma.groupJoinRequest.update({
      where: { id: requestId, tenantId, userId },
      data: { status: 'rejected', error: reason || 'User rejected the join request' },
    });

    await logAudit(
      userId,
      userName,
      'group_join_request',
      requestId,
      'updated',
      [{ field: 'action', oldValue: null, newValue: 'GROUP_JOIN_REJECTED' }],
      tenantId
    );
  }

  async recordConsent(
    tenantId: string,
    userId: string,
    userName: string,
    ipAddress?: string
  ): Promise<JoinConsent> {
    const existing = await prisma.joinConsent.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    const consent = existing
      ? await prisma.joinConsent.update({
          where: { id: existing.id },
          data: { consentGiven: true, consentAt: new Date(), ipAddress },
        })
      : await prisma.joinConsent.create({
          data: { tenantId, userId, consentGiven: true, consentAt: new Date(), ipAddress },
        });

    await logAudit(
      userId,
      userName,
      'join_consent',
      consent.id,
      existing ? 'updated' : 'created',
      [{ field: 'type', oldValue: null, newValue: 'whatsapp_group_join' }],
      tenantId
    );

    return consent as unknown as JoinConsent;
  }

  async getUserGroups(
    tenantId: string,
    userId: string
  ): Promise<UserGroupMembership[]> {
    const memberships = await prisma.userGroupMembership.findMany({
      where: { tenantId, userId, isActive: true },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships as unknown as UserGroupMembership[];
  }

  async leaveGroup(
    membershipId: string,
    tenantId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await prisma.userGroupMembership.update({
      where: { id: membershipId, tenantId, userId },
      data: { isActive: false, leftAt: new Date() },
    });

    await logAudit(
      userId,
      userName,
      'group_membership',
      membershipId,
      'updated',
      [{ field: 'action', oldValue: null, newValue: 'GROUP_LEFT' }],
      tenantId
    );
  }

  async getPendingRequests(
    tenantId: string,
    userId: string
  ): Promise<GroupJoinRequest[]> {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { tenantId, userId, status: 'pending' },
      orderBy: { requestedAt: 'desc' },
    });

    return requests as unknown as GroupJoinRequest[];
  }

  async hasConsent(tenantId: string, userId: string): Promise<boolean> {
    const consent = await prisma.joinConsent.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    return consent?.consentGiven === true;
  }
}

export const groupJoinService = new GroupJoinService();
