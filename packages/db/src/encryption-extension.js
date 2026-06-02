"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptField = encryptField;
exports.decryptField = decryptField;
exports.getEncryptionExtension = getEncryptionExtension;
const client_1 = require("@prisma/client");
const crypto_js_1 = __importDefault(require("crypto-js"));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-only-32-byte-key-not-for-prod!!';
function encryptField(value) {
    if (!value)
        return null;
    return crypto_js_1.default.AES.encrypt(value, ENCRYPTION_KEY).toString();
}
function decryptField(encrypted) {
    if (!encrypted)
        return null;
    try {
        const bytes = crypto_js_1.default.AES.decrypt(encrypted, ENCRYPTION_KEY);
        return bytes.toString(crypto_js_1.default.enc.Utf8);
    }
    catch {
        return null;
    }
}
function resolveStringValue(value) {
    if (typeof value === 'string')
        return value;
    if (value && typeof value === 'object' && 'set' in value) {
        const v = value.set;
        return typeof v === 'string' ? v : null;
    }
    return null;
}
let _extension = null;
function getEncryptionExtension() {
    if (_extension)
        return _extension;
    _extension = client_1.Prisma.defineExtension({
        name: 'encryption',
        query: {
            whatsAppAccount: {
                async create({ args, query }) {
                    const rawAccessToken = args.data.accessToken;
                    const resolvedAccessToken = resolveStringValue(rawAccessToken);
                    if (resolvedAccessToken) {
                        args.data.accessToken = encryptField(resolvedAccessToken);
                    }
                    const rawAppSecret = args.data.appSecret;
                    const resolvedAppSecret = resolveStringValue(rawAppSecret);
                    if (resolvedAppSecret) {
                        args.data.appSecret = encryptField(resolvedAppSecret);
                    }
                    return query(args);
                },
                async update({ args, query }) {
                    const rawAccessToken = args.data.accessToken;
                    const resolvedAccessToken = resolveStringValue(rawAccessToken);
                    if (resolvedAccessToken && resolvedAccessToken !== '••••••••') {
                        args.data.accessToken = encryptField(resolvedAccessToken);
                    }
                    const rawAppSecret = args.data.appSecret;
                    const resolvedAppSecret = resolveStringValue(rawAppSecret);
                    if (resolvedAppSecret && resolvedAppSecret !== '••••••••') {
                        args.data.appSecret = encryptField(resolvedAppSecret);
                    }
                    return query(args);
                },
            },
            sSOProvider: {
                async create({ args, query }) {
                    const rawSecret = args.data.clientSecret;
                    const resolved = resolveStringValue(rawSecret);
                    if (resolved) {
                        args.data.clientSecret = encryptField(resolved);
                    }
                    return query(args);
                },
                async update({ args, query }) {
                    const rawSecret = args.data.clientSecret;
                    const resolved = resolveStringValue(rawSecret);
                    if (resolved && resolved !== '••••••••') {
                        args.data.clientSecret = encryptField(resolved);
                    }
                    return query(args);
                },
            },
        },
        result: {
            whatsAppAccount: {
                accessTokenDecrypted: {
                    needs: { accessToken: true },
                    compute(account) {
                        return decryptField(account.accessToken);
                    },
                },
                appSecretDecrypted: {
                    needs: { appSecret: true },
                    compute(account) {
                        return decryptField(account.appSecret);
                    },
                },
            },
            sSOProvider: {
                clientSecretDecrypted: {
                    needs: { clientSecret: true },
                    compute(provider) {
                        return decryptField(provider.clientSecret);
                    },
                },
            },
        },
    });
    return _extension;
}
//# sourceMappingURL=encryption-extension.js.map