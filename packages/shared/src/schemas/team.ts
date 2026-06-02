import { z } from 'zod';

export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional().default(''),
  assignmentStrategy: z.enum(['round_robin', 'load_balanced', 'manual']).default('round_robin'),
  perAgentTimeoutSecs: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateTeamSchema = teamSchema.partial();

export const teamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['manager', 'agent']).default('agent'),
});

export type TeamInput = z.infer<typeof teamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

export interface TeamResponse {
  id: string;
  name: string;
  description: string;
  assignmentStrategy: 'round_robin' | 'load_balanced' | 'manual';
  perAgentTimeoutSecs: number;
  isActive: boolean;
  memberCount: number;
  members?: TeamMemberResponse[];
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberResponse {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'manager' | 'agent';
  isAvailable: boolean;
  lastAssignedAt?: string;
}


