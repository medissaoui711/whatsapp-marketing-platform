import { z } from 'zod';

const iceServerSchema = z.object({
  urls: z.array(z.string()),
  username: z.string().optional(),
  credential: z.string().optional(),
});

const callingConfigSchema = z.object({
  maxCallDuration: z.number().default(300),
  audioDir: z.string().default('./audio'),
  holdMusicFile: z.string().default('hold_music.opus'),
  transferTimeoutSecs: z.number().default(120),
  perAgentTimeoutSecs: z.number().default(60),
  ringbackFile: z.string().default('ringback.opus'),
  udpPortMin: z.number().min(1024).max(65535).default(10000),
  udpPortMax: z.number().min(1024).max(65535).default(10100),
  publicIp: z.string().optional(),
  relayOnly: z.boolean().default(false),
  iceServers: z.array(iceServerSchema).default([]),
  recordingEnabled: z.boolean().default(false),
});

const ttsConfigSchema = z.object({
  piperBinary: z.string().default('piper'),
  piperModel: z.string().default('./models/voice.onnx'),
  opusencBinary: z.string().default('opusenc'),
});

const storageConfigSchema = z.object({
  type: z.enum(['local', 's3']).default('local'),
  localPath: z.string().default('./uploads'),
  s3Bucket: z.string().optional(),
  s3Region: z.string().optional(),
  s3Key: z.string().optional(),
  s3Secret: z.string().optional(),
  s3Endpoint: z.string().optional(),
});

const whatsappConfigSchema = z.object({
  webhookVerifyToken: z.string().default(''),
  apiVersion: z.string().default('v18.0'),
  baseUrl: z.string().default('https://graph.facebook.com'),
});

const aiConfigSchema = z.object({
  openaiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  googleKey: z.string().optional(),
});

const rateLimitConfigSchema = z.object({
  enabled: z.boolean().default(true),
  loginMaxAttempts: z.number().default(10),
  registerMaxAttempts: z.number().default(10),
  refreshMaxAttempts: z.number().default(30),
  ssoMaxAttempts: z.number().default(10),
  windowSeconds: z.number().default(60),
  trustProxy: z.boolean().default(false),
  apiMaxRequests: z.number().default(100),
  apiWindowSeconds: z.number().default(60),
});

const cookieConfigSchema = z.object({
  domain: z.string().optional(),
  secure: z.boolean().default(false),
});

export const configSchema = z.object({
  app: z.object({
    name: z.string().default('Whatomate'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    debug: z.boolean().default(false),
    encryptionKey: z.string().min(32, 'Encryption key must be at least 32 characters'),
  }),
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.coerce.number().min(1).max(65535).default(3000),
    readTimeout: z.number().default(30),
    writeTimeout: z.number().default(30),
    basePath: z.string().default(''),
    allowedOrigins: z.string().default('http://localhost:3000'),
  }),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
    name: z.string().default('saas_platform'),
    sslMode: z.enum(['disable', 'require', 'verify-ca', 'verify-full']).default('disable'),
    maxOpenConns: z.coerce.number().default(25),
    maxIdleConns: z.coerce.number().default(5),
    connMaxLifetime: z.coerce.number().default(300),
  }),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    username: z.string().optional(),
    password: z.string().optional(),
    db: z.coerce.number().default(0),
    tls: z.boolean().default(false),
  }),
  jwt: z.object({
    secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    refreshSecret: z.string().min(32, 'Refresh secret must be at least 32 characters'),
    accessExpiryMins: z.coerce.number().default(15),
    refreshExpiryDays: z.coerce.number().default(7),
  }),
  whatsapp: whatsappConfigSchema,
  ai: aiConfigSchema,
  storage: storageConfigSchema,
  defaultAdmin: z.object({
    email: z.string().default('admin@demo.com'),
    password: z.string().min(6).default('admin123'),
    fullName: z.string().default('Admin User'),
  }),
  rateLimit: rateLimitConfigSchema,
  cookie: cookieConfigSchema,
  calling: callingConfigSchema,
  tts: ttsConfigSchema,
});

export type Config = z.infer<typeof configSchema>;


