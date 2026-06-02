import type Redis from 'ioredis';
import type { PrismaClient } from '@prisma/client';
import { chatLoadCounter, callLoadCounter, combinedLoadCounter } from './load-counters';
import type { AssignmentStrategy, TeamConfig, LoadCounter } from './types';

const TEAM_CACHE_PREFIX = 'team:assignment:';
const CACHE_TTL = 6 * 60 * 60;

export class Assigner {
  constructor(
    private db: PrismaClient,
    private redis: Redis,
    private logger: Console
  ) {}

  async getTeamConfig(teamId: string): Promise<TeamConfig | null> {
    const cacheKey = `${TEAM_CACHE_PREFIX}${teamId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TeamConfig;
    }

    const team = await (this.db as any).team.findUnique({
      where: { id: teamId, isActive: true },
      include: {
        members: {
          where: { role: 'agent' },
          include: { user: true },
        },
      },
    });

    if (!team) return null;

    const config: TeamConfig = {
      id: team.id,
      strategy: team.assignmentStrategy as AssignmentStrategy,
      memberIds: team.members
        .filter((m: Record<string, unknown>) => (m.user as Record<string, unknown>)?.isActive)
        .map((m: Record<string, unknown>) => m.userId as string),
      perAgentTimeoutSecs: team.perAgentTimeoutSecs as number,
    };

    await this.redis.set(cacheKey, JSON.stringify(config), 'EX', CACHE_TTL);

    return config;
  }

  async invalidateTeamCache(teamId: string): Promise<void> {
    const cacheKey = `${TEAM_CACHE_PREFIX}${teamId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Invalidated team assignment cache: ${teamId}`);
  }

  async assignToTeam(
    teamId: string,
    orgId: string,
    excludeAgentIds: string[] = [],
    loadCounter?: LoadCounter
  ): Promise<string | null> {
    const config = await this.getTeamConfig(teamId);
    if (!config) return null;

    switch (config.strategy) {
      case 'round_robin':
        return this.assignRoundRobin(teamId, orgId, config.memberIds, excludeAgentIds);
      case 'load_balanced':
        return this.assignLoadBalanced(orgId, config.memberIds, excludeAgentIds, loadCounter);
      case 'manual':
        return null;
      default:
        return this.assignRoundRobin(teamId, orgId, config.memberIds, excludeAgentIds);
    }
  }

  async getAvailableAgents(
    teamId: string,
    excludeAgentIds: string[] = []
  ): Promise<string[]> {
    const config = await this.getTeamConfig(teamId);
    if (!config) return [];

    return this.filterAvailable(config.memberIds, excludeAgentIds);
  }

  private async assignRoundRobin(
    teamId: string,
    _orgId: string,
    memberIds: string[],
    excludeAgentIds: string[]
  ): Promise<string | null> {
    const available = await this.filterAvailable(memberIds, excludeAgentIds);
    if (available.length === 0) {
      this.logger.debug(`No available agents for round-robin: team ${teamId}`);
      return null;
    }

    const members = await (this.db as any).teamMember.findMany({
      where: {
        teamId,
        userId: { in: available },
      },
      orderBy: [
        { lastAssignedAt: 'asc' },
      ],
      take: 1,
    });

    if (members.length === 0) return null;

    const selected = members[0];
    const now = new Date();

    await (this.db as any).teamMember.update({
      where: { id: selected.id },
      data: { lastAssignedAt: now },
    });

    this.logger.debug(`Round-robin assigned agent ${selected.userId} to team ${teamId}`);
    return selected.userId as string;
  }

  private async assignLoadBalanced(
    orgId: string,
    memberIds: string[],
    excludeAgentIds: string[],
    loadCounter?: LoadCounter
  ): Promise<string | null> {
    const available = await this.filterAvailable(memberIds, excludeAgentIds);
    if (available.length === 0) {
      this.logger.debug('No available agents for load-balanced assignment');
      return null;
    }

    if (!loadCounter) {
      this.logger.warn('Load counter not provided for load-balanced strategy');
      return available[0];
    }

    const loads = await loadCounter(this.db as any, orgId, available);

    let lowestAgentId: string | null = null;
    let lowestCount = -1;

    for (const agentId of available) {
      const count = loads.get(agentId) || 0;
      if (lowestCount < 0 || count < lowestCount) {
        lowestCount = count;
        lowestAgentId = agentId;
      }
    }

    this.logger.debug(`Load-balanced assigned agent ${lowestAgentId} with load ${lowestCount}`);
    return lowestAgentId;
  }

  async assignToTeamWithChatLoad(
    teamId: string,
    orgId: string,
    excludeAgentIds: string[] = []
  ): Promise<string | null> {
    return this.assignToTeam(teamId, orgId, excludeAgentIds, async (_db, org, agents) => {
      return chatLoadCounter(this.db, org, agents);
    });
  }

  async assignToTeamWithCallLoad(
    teamId: string,
    orgId: string,
    excludeAgentIds: string[] = []
  ): Promise<string | null> {
    return this.assignToTeam(teamId, orgId, excludeAgentIds, async (_db, org, agents) => {
      return callLoadCounter(this.db, org, agents);
    });
  }

  async assignToTeamWithCombinedLoad(
    teamId: string,
    orgId: string,
    excludeAgentIds: string[] = []
  ): Promise<string | null> {
    return this.assignToTeam(teamId, orgId, excludeAgentIds, async (_db, org, agents) => {
      return combinedLoadCounter(this.db, org, agents);
    });
  }

  private async filterAvailable(
    memberIds: string[],
    excludeAgentIds: string[]
  ): Promise<string[]> {
    if (memberIds.length === 0) return [];

    const excludeSet = new Set(excludeAgentIds);
    const candidates = memberIds.filter(id => !excludeSet.has(id));

    if (candidates.length === 0) return [];

    const users = await (this.db as any).user.findMany({
      where: {
        id: { in: candidates },
        isAvailable: true,
        isActive: true,
      },
      select: { id: true },
    });

    return users.map((u: Record<string, unknown>) => u.id as string);
  }
}


