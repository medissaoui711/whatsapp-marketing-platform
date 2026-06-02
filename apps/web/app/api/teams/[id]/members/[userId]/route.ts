import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const DELETE = withAuthAndPermission('teams:write')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string; userId: string } },
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

      const targetMember = team.members.find(m => m.userId === params.userId);
      if (targetMember?.role === 'manager') {
        return NextResponse.json({ error: 'Insufficient permissions to remove managers' }, { status: 403 });
      }
    }

    const result = await prisma.teamMember.deleteMany({
      where: { teamId: params.id, userId: params.userId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Member not found in team' }, { status: 404 });
    }

    await logAudit(
      context.userId, context.email, 'Team', team.id,
      'deleted', [{ field: 'member', newValue: params.userId }], context.tenantId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team member remove error:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
});
