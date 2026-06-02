export type AssignmentStrategy = 'round_robin' | 'load_balanced' | 'manual';

export interface TeamConfig {
  id: string;
  strategy: AssignmentStrategy;
  memberIds: string[];
  perAgentTimeoutSecs: number;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'manager' | 'agent';
  lastAssignedAt: Date | null;
}

export interface User {
  id: string;
  isAvailable: boolean;
  isActive: boolean;
}

export type LoadCounter = (
  db: Record<string, unknown>,
  orgId: string,
  agentIds: string[]
) => Promise<Map<string, number>>;


