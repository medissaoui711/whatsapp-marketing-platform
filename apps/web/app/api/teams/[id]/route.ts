import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateTeamSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import type { TeamResponse } from '@repo/shared';

export const GET = withAuthAndPermission('teams:read')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } },
) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: params.id, organizationId: context.tenantId },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, email: true, isAvailable: true } } },
        },
        createdBy: { select: { id: true, fullName: true } },
        updatedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const hasFullAccess = context.role === 'owner' || context.role === 'admin';
    if (!hasFullAccess) {
      const isMember = team.members.some(m => m.userId === context.userId);
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const response = {
      id: team.id,
      name: team.name,
      description: team.description || '',
      assignmentStrategy: team.assignmentStrategy as any,
      perAgentTimeoutSecs: team.perAgentTimeoutSecs,
      isActive: team.isActive,
      memberCount: team.members.length,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        fullName: m.user.fullName || '',
        email: m.user.email || '',
        role: m.role as any,
        isAvailable: m.user.isAvailable,
        lastAssignedAt: m.lastAssignedAt?.toISOString(),
      })),
      createdById: team.createdById ?? undefined,
      createdByName: team.createdBy?.fullName ?? undefined,
      updatedById: team.updatedById ?? undefined,
      updatedByName: team.updatedBy?.fullName ?? undefined,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    } as TeamResponse;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Team get error:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
});

export const PUT = withAuthAndPermission('teams:write')(async (
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
    const validation = updateTeamSchema.safeParse(body);

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
    const updateData: Record<string, any> = { updatedById: context.userId };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assignmentStrategy !== undefined) updateData.assignmentStrategy = data.assignmentStrategy;
    if (data.perAgentTimeoutSecs !== undefined) updateData.perAgentTimeoutSecs = data.perAgentTimeoutSecs;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, email: true, isAvailable: true } } },
        },
        createdBy: { select: { id: true, fullName: true } },
        updatedBy: { select: { id: true, fullName: true } },
      },
    });

    await logAudit(
      context.userId, context.email, 'Team', team.id,
      'updated', [{ field: 'changes', newValue: Object.keys(updateData) }], context.tenantId,
    );

    const response = {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      assignmentStrategy: updated.assignmentStrategy as any,
      perAgentTimeoutSecs: updated.perAgentTimeoutSecs,
      isActive: updated.isActive,
      memberCount: updated.members.length,
      members: updated.members.map(m => ({
        id: m.id,
        userId: m.userId,
        fullName: m.user.fullName || '',
        email: m.user.email || '',
        role: m.role as any,
        isAvailable: m.user.isAvailable,
        lastAssignedAt: m.lastAssignedAt?.toISOString(),
      })),
      createdById: updated.createdById ?? undefined,
      createdByName: updated.createdBy?.fullName ?? undefined,
      updatedById: updated.updatedById ?? undefined,
      updatedByName: updated.updatedBy?.fullName ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    } as TeamResponse;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Team update error:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission('teams:delete')(async (
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

    await prisma.teamMember.deleteMany({ where: { teamId: params.id } });
    await prisma.team.delete({ where: { id: params.id } });

    await logAudit(
      context.userId, context.email, 'Team', team.id,
      'deleted', [{ field: 'name', newValue: team.name }], context.tenantId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team delete error:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
});
