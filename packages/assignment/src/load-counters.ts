import { PrismaClient } from '@prisma/client';

export async function chatLoadCounter(
  prisma: PrismaClient,
  orgId: string,
  agentIds: string[]
): Promise<Map<string, number>> {
  if (agentIds.length === 0) {
    return new Map();
  }

  const loads = await prisma.agentTransfer.groupBy({
    by: ['agentId'],
    where: {
      organizationId: orgId,
      agentId: { in: agentIds },
      status: 'active',
    },
    _count: {
      agentId: true,
    },
  });

  const loadMap = new Map<string, number>();
  for (const load of loads) {
    if (load.agentId) {
      loadMap.set(load.agentId, load._count.agentId);
    }
  }

  return loadMap;
}

export async function callLoadCounter(
  prisma: PrismaClient,
  orgId: string,
  agentIds: string[]
): Promise<Map<string, number>> {
  if (agentIds.length === 0) {
    return new Map();
  }

  const loads = await prisma.callTransfer.groupBy({
    by: ['agentId'],
    where: {
      organizationId: orgId,
      agentId: { in: agentIds },
      status: { in: ['waiting', 'connected'] },
    },
    _count: {
      agentId: true,
    },
  });

  const loadMap = new Map<string, number>();
  for (const load of loads) {
    if (load.agentId) {
      loadMap.set(load.agentId, load._count.agentId);
    }
  }

  return loadMap;
}

export async function combinedLoadCounter(
  prisma: PrismaClient,
  orgId: string,
  agentIds: string[]
): Promise<Map<string, number>> {
  const [chatLoads, callLoads] = await Promise.all([
    chatLoadCounter(prisma, orgId, agentIds),
    callLoadCounter(prisma, orgId, agentIds),
  ]);

  const combinedMap = new Map<string, number>();

  for (const agentId of agentIds) {
    combinedMap.set(agentId, 0);
  }

  for (const [agentId, count] of chatLoads) {
    combinedMap.set(agentId, (combinedMap.get(agentId) || 0) + count);
  }

  for (const [agentId, count] of callLoads) {
    combinedMap.set(agentId, (combinedMap.get(agentId) || 0) + count);
  }

  return combinedMap;
}


