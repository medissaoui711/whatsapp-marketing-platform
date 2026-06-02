import { PrismaClient } from '@prisma/client';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  sslMode?: string;
  maxOpenConns?: number;
  maxIdleConns?: number;
  connMaxLifetime?: number;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | null = null;

function getProductionConfig(databaseUrl: string) {
  return {
    datasources: {
      db: { url: databaseUrl },
    },
    log: ['error'] as ('query' | 'error' | 'warn')[],
    connectionLimit: 20,
    query_timeout: 30000,
    connect_timeout: 10000,
  };
}

export function createPrismaClient(config?: DatabaseConfig): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const databaseUrl = config
    ? `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.name}`
    : process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  const options = process.env.NODE_ENV === 'production'
    ? getProductionConfig(databaseUrl)
    : {
        datasources: {
          db: { url: databaseUrl },
        },
        log: ['query', 'error', 'warn'] as ('query' | 'error' | 'warn')[],
      };

  const client = new PrismaClient(options);

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  prismaInstance = client;

  if (process.env.NODE_ENV === 'production') {
    const metricsInterval = setInterval(async () => {
      try {
        const poolInfo = await client.$metrics.json().catch(() => null);
        if (poolInfo && typeof poolInfo === 'object' && 'counters' in poolInfo) {
          const counters = (poolInfo as { counters: Array<{ name: string; value: number }> }).counters;
          const active = counters.find((c) => c.name === 'prisma_pool_connections_active')?.value ?? 0;
          const idle = counters.find((c) => c.name === 'prisma_pool_connections_idle')?.value ?? 0;
          const total = counters.find((c) => c.name === 'prisma_pool_connections_total')?.value ?? 0;
          console.log(`[DB Pool] Active: ${active}, Idle: ${idle}, Total: ${total}`);
        }
      } catch {
        // metrics not available in all versions
      }
    }, 60000);

    process.on('SIGTERM', () => {
      clearInterval(metricsInterval);
    });
  }

  return client;
}

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    return createPrismaClient();
  }
  return prismaInstance;
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
