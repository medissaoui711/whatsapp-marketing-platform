import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { teamSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import type { TeamResponse } from '@repo/shared';

export const GET = withAuthAndPermission('teams:read')(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;
    const hasFullAccess = context.role === 'owner' || context.role === 'admin';

    let where: any = { organizationId: context.tenantId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (!hasFullAccess) {
      const userTeams = await prisma.teamMember.findMany({
        where: { userId: context.userId },
        select: { teamId: true },
      });
      where.id = { in: userTeams.map(t => t.teamId) };
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          members: {
            include: { user: { select: { id: true, fullName: true, email: true, isAvailable: true } } },
          },
          createdBy: { select: { id: true, fullName: true } },
          updatedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.team.count({ where }),
    ]);

    const data: TeamResponse[] = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description || '',
      assignmentStrategy: team.assignmentStrategy as any,
      perAgentTimeoutSecs: team.perAgentTimeoutSecs,
      isActive: team.isActive,
      memberCount: team.members.length,
      createdById: team.createdById ?? undefined,
      createdByName: team.createdBy?.fullName ?? undefined,
      updatedById: team.updatedById ?? undefined,
      updatedByName: team.updatedBy?.fullName ?? undefined,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    } as TeamResponse));

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error('Teams list error:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
});

export const POST = withAuthAndPermission('teams:write')(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const validation = teamSchema.safeParse(body);

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

    const team = await prisma.team.create({
      data: {
        organizationId: context.tenantId,
        name: data.name,
        description: data.description,
        assignmentStrategy: data.assignmentStrategy as any,
        perAgentTimeoutSecs: data.perAgentTimeoutSecs,
        isActive: data.isActive,
        createdById: context.userId,
        updatedById: context.userId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        updatedBy: { select: { id: true, fullName: true } },
      },
    });

    await logAudit(
      context.userId, context.email, 'Team', team.id,
      'created', [{ field: 'name', newValue: team.name }], context.tenantId,
    );

    const response: TeamResponse = {
      id: team.id,
      name: team.name,
      description: team.description || '',
      assignmentStrategy: team.assignmentStrategy as any,
      perAgentTimeoutSecs: team.perAgentTimeoutSecs,
      isActive: team.isActive,
      memberCount: 0,
      createdById: team.createdById ?? undefined,
      createdByName: team.createdBy?.fullName ?? undefined,
      updatedById: team.updatedById ?? undefined,
      updatedByName: team.updatedBy?.fullName ?? undefined,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    } as TeamResponse;

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Teams create error:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
});


