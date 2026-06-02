"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaClient = createPrismaClient;
exports.getPrisma = getPrisma;
exports.disconnectDatabase = disconnectDatabase;
exports.testConnection = testConnection;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
let prismaInstance = null;
function createPrismaClient(config) {
    if (prismaInstance)
        return prismaInstance;
    const databaseUrl = config
        ? `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.name}`
        : process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not defined');
    }
    const client = new client_1.PrismaClient({
        datasources: {
            db: { url: databaseUrl },
        },
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });
    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = client;
    }
    prismaInstance = client;
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