import { randomBytes } from 'crypto';
import { prisma } from '@repo/db';

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_IDLE_TIMEOUT_SECONDS = 30 * 60;

export async function createSession(
  userId: string,
  tenantId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<Session> {
  const sessionId = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      tenantId,
      expiresAt,
      lastActivityAt: now,
      ipAddress,
      userAgent,
    },
  });

  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return null;
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export function isSessionIdle(session: Session): boolean {
  const idleTime = Date.now() - session.lastActivityAt.getTime();
  return idleTime > SESSION_IDLE_TIMEOUT_SECONDS * 1000;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}


