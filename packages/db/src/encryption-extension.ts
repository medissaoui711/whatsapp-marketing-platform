import { Prisma } from '@prisma/client';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-only-32-byte-key-not-for-prod!!';

export function encryptField(value: string | null): string | null {
  if (!value) return null;
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
}

export function decryptField(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}

function resolveStringValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'set' in (value as Record<string, unknown>)) {
    const v = (value as Record<string, unknown>).set;
    return typeof v === 'string' ? v : null;
  }
  return null;
}

let _extension: ReturnType<typeof Prisma.defineExtension> | null = null;

export function getEncryptionExtension() {
  if (_extension) return _extension;
  _extension = Prisma.defineExtension({
    name: 'encryption',
    query: {
      whatsAppAccount: {
        async create({ args, query }) {
          const rawAccessToken = args.data.accessToken;
          const resolvedAccessToken = resolveStringValue(rawAccessToken);
          if (resolvedAccessToken) {
            args.data.accessToken = encryptField(resolvedAccessToken)!;
          }

          const rawAppSecret = args.data.appSecret;
          const resolvedAppSecret = resolveStringValue(rawAppSecret);
          if (resolvedAppSecret) {
            args.data.appSecret = encryptField(resolvedAppSecret)!;
          }

          return query(args);
        },
        async update({ args, query }) {
          const rawAccessToken = args.data.accessToken;
          const resolvedAccessToken = resolveStringValue(rawAccessToken);
          if (resolvedAccessToken && resolvedAccessToken !== '••••••••') {
            (args.data.accessToken as string) = encryptField(resolvedAccessToken)!;
          }

          const rawAppSecret = args.data.appSecret;
          const resolvedAppSecret = resolveStringValue(rawAppSecret);
          if (resolvedAppSecret && resolvedAppSecret !== '••••••••') {
            (args.data.appSecret as string) = encryptField(resolvedAppSecret)!;
          }

          return query(args);
        },
      },
      sSOProvider: {
        async create({ args, query }) {
          const rawSecret = args.data.clientSecret;
          const resolved = resolveStringValue(rawSecret);
          if (resolved) {
            args.data.clientSecret = encryptField(resolved)!;
          }
          return query(args);
        },
        async update({ args, query }) {
          const rawSecret = args.data.clientSecret;
          const resolved = resolveStringValue(rawSecret);
          if (resolved && resolved !== '••••••••') {
            (args.data.clientSecret as string) = encryptField(resolved)!;
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


