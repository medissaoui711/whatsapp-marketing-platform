"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactRepository = exports.ContactRepository = exports.BaseRepository = exports.organizationService = exports.formatPhoneWithCountryCode = exports.normalizeContactPhone = exports.isServiceWindowOpen = exports.updateContactLastInbound = exports.updateContactLastMessage = exports.getOrCreateContact = exports.createRedisClient = exports.testRedisConnection = exports.closeRedis = exports.getRedis = exports.testConnection = exports.disconnectDatabase = exports.createPrismaClient = exports.getTenantAwarePrisma = exports.decryptField = exports.encryptField = exports.prisma = void 0;
const encryption_extension_1 = require("./encryption-extension");
Object.defineProperty(exports, "encryptField", { enumerable: true, get: function () { return encryption_extension_1.encryptField; } });
Object.defineProperty(exports, "decryptField", { enumerable: true, get: function () { return encryption_extension_1.decryptField; } });
const connection_1 = require("./connection");
Object.defineProperty(exports, "createPrismaClient", { enumerable: true, get: function () { return connection_1.createPrismaClient; } });
Object.defineProperty(exports, "disconnectDatabase", { enumerable: true, get: function () { return connection_1.disconnectDatabase; } });
Object.defineProperty(exports, "testConnection", { enumerable: true, get: function () { return connection_1.testConnection; } });
const client_1 = require("./client");
const globalForPrisma = globalThis;
function createExtendedClient() {
    const base = (0, connection_1.getPrisma)();
    const isEdgeRuntime = typeof globalThis.EdgeRuntime === 'string';
    const extended = isEdgeRuntime ? base : base.$extends((0, encryption_extension_1.getEncryptionExtension)());
    (0, client_1.initializeTenantMiddleware)(extended);
    return extended;
}
exports.prisma = globalForPrisma.prisma ?? createExtendedClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
__exportStar(require("@prisma/client"), exports);
const getTenantAwarePrisma = () => {
    return exports.prisma;
};
exports.getTenantAwarePrisma = getTenantAwarePrisma;
var redis_1 = require("./redis");
Object.defineProperty(exports, "getRedis", { enumerable: true, get: function () { return redis_1.getRedis; } });
Object.defineProperty(exports, "closeRedis", { enumerable: true, get: function () { return redis_1.closeRedis; } });
Object.defineProperty(exports, "testRedisConnection", { enumerable: true, get: function () { return redis_1.testRedisConnection; } });
Object.defineProperty(exports, "createRedisClient", { enumerable: true, get: function () { return redis_1.createRedisClient; } });
var contact_1 = require("./contact");
Object.defineProperty(exports, "getOrCreateContact", { enumerable: true, get: function () { return contact_1.getOrCreateContact; } });
Object.defineProperty(exports, "updateContactLastMessage", { enumerable: true, get: function () { return contact_1.updateContactLastMessage; } });
Object.defineProperty(exports, "updateContactLastInbound", { enumerable: true, get: function () { return contact_1.updateContactLastInbound; } });
Object.defineProperty(exports, "isServiceWindowOpen", { enumerable: true, get: function () { return contact_1.isServiceWindowOpen; } });
Object.defineProperty(exports, "normalizeContactPhone", { enumerable: true, get: function () { return contact_1.normalizeContactPhone; } });
Object.defineProperty(exports, "formatPhoneWithCountryCode", { enumerable: true, get: function () { return contact_1.formatPhoneWithCountryCode; } });
var tenant_service_1 = require("./services/tenant.service");
Object.defineProperty(exports, "organizationService", { enumerable: true, get: function () { return tenant_service_1.organizationService; } });
var base_repository_1 = require("./repositories/base.repository");
Object.defineProperty(exports, "BaseRepository", { enumerable: true, get: function () { return base_repository_1.BaseRepository; } });
var contact_repository_1 = require("./repositories/contact.repository");
Object.defineProperty(exports, "ContactRepository", { enumerable: true, get: function () { return contact_repository_1.ContactRepository; } });
Object.defineProperty(exports, "contactRepository", { enumerable: true, get: function () { return contact_repository_1.contactRepository; } });
//# sourceMappingURL=index.js.map