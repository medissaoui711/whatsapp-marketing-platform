"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaClient = createPrismaClient;
exports.getPrisma = getPrisma;
exports.disconnectDatabase = disconnectDatabase;
exports.testConnection = testConnection;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
let prismaInstance = null;
function getProductionConfig(databaseUrl) {
    return {
        datasources: {
            db: { url: databaseUrl },
        },
        log: ['error'],
        connectionLimit: 20,
        query_timeout: 30000,
        connect_timeout: 10000,
    };
}
function createPrismaClient(config) {
    if (prismaInstance)
        return prismaInstance;
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
            log: ['query', 'error', 'warn'],
        };
    const client = new client_1.PrismaClient(options);
    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = client;
    }
    prismaInstance = client;
    if (process.env.NODE_ENV === 'production') {
        const metricsInterval = setInterval(async () => {
            try {
                const poolInfo = await client.$metrics?.json().catch(() => null);
                if (poolInfo && typeof poolInfo === 'object' && 'counters' in poolInfo) {
                    const counters = poolInfo.counters;
                    const active = counters.find((c) => c.name === 'prisma_pool_connections_active')?.value ?? 0;
                    const idle = counters.find((c) => c.name === 'prisma_pool_connections_idle')?.value ?? 0;
                    const total = counters.find((c) => c.name === 'prisma_pool_connections_total')?.value ?? 0;
                    console.log(`[DB Pool] Active: ${active}, Idle: ${idle}, Total: ${total}`);
                }
            }
            catch {
                // metrics not available in all versions
            }
        }, 60000);
        process.on('SIGTERM', () => {
            clearInterval(metricsInterval);
        });
    }
    return client;
}
function getPrisma() {
    if (!prismaInstance) {
        return createPrismaClient();
    }
    return prismaInstance;
}
async function disconnectDatabase() {
    if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
    }
}
async function testConnection() {
    try {
        const prisma = getPrisma();
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=connection.js.map