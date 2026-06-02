import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function GET() {
  const health: {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
      database: { status: 'up' | 'down'; latency?: number };
      redis: { status: 'up' | 'down'; latency?: number };
    };
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'up' },
      redis: { status: 'up' },
    },
  };

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database.latency = Date.now() - start;
  } catch {
    health.services.database.status = 'down';
    health.status = 'unhealthy';
  }

  try {
    const start = Date.now();
    await redis.ping();
    health.services.redis.latency = Date.now() - start;
  } catch {
    health.services.redis.status = 'down';
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
