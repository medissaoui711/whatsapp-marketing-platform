import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { teamMemberSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import type { TeamMemberResponse } from '@repo/shared';

export const GET = withAuthAndPermission('teams:read')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } },
) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: params.id, organizationId: context.tenantId },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const hasFullAccess = context.role === 'owner' || context.role === 'admin';
    if (!hasFullAccess) {
      const isMember = await prisma.teamMember.findFirst({
        where: { teamId: params.id, userId: context.userId },
      });
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId: params.id },
      include: { user: { select: { id: true, fullName: true, email: true, isAvailable: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const data: TeamMemberResponse[] = members.map(m => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName || '',
      email: m.user.email || '',
      role: m.role as any,
      isAvailable: m.user.isAvailable,
      lastAssignedAt: m.lastAssignedAt?.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Team members list error:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
});

export const POST = withAuthAndPermission('teams:write')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } },
) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: params.id, organizationId: context.tenantId },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const hasFullAccess = context.role === 'owner' || context.role === 'admin';
    if (!hasFullAccess) {
      const isManager = team.members.some(m => m.userId === context.userId && m.role === 'manager');
      if (!isManager) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const body = await request.json();
    const validation = teamMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'بيانات غير صحيحة',
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const data = validation.data;

    const user = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: context.tenantId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingMember = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId: data.userId },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 });
    }

    if (data.role === 'manager' && !hasFullAccess) {
      return NextResponse.json({ error: 'Insufficient permissions to add managers' }, { status: 403 });
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: params.id,
        userId: data.userId,
        role: data.role as any,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, isAvailable: true } },
      },
    });

    await logAudit(
      context.userId, context.email, 'Team', team.id,
      'created', [{ field: 'member', newValue: data.userId }, { field: 'role', newValue: data.role }], context.tenantId,
    );

    const response: TeamMemberResponse = {
      id: member.id,
      userId: member.userId,
      fullName: member.user.fullName || '',
      email: member.user.email || '',
      role: member.role as any,
      isAvailable: member.user.isAvailable,
      lastAssignedAt: member.lastAssignedAt?.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Team member add error:', error);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
});
