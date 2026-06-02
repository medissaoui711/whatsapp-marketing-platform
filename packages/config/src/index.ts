import { readFileSync, existsSync } from 'fs';
import { parse } from 'smol-toml';
import { configSchema, type Config } from './schema';

function loadFromToml(configPath?: string): Record<string, unknown> {
  if (!configPath || !existsSync(configPath)) return {};

  try {
    const content = readFileSync(configPath, 'utf-8');
    return parse(content) as Record<string, unknown>;
  } catch (error) {
    console.warn(`[config] Failed to load TOML from ${configPath}:`, error);
    return {};
  }
}

function loadFromEnv(): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};

  const set = (path: string[], value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    let current = cfg;
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] ??= {};
      current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;
  };

  set(['app', 'name'], process.env.APP_NAME);
  set(['app', 'environment'], process.env.NODE_ENV);
  set(['app', 'debug'], process.env.APP_DEBUG === 'true' ? true : undefined);
  set(['app', 'encryptionKey'], process.env.ENCRYPTION_KEY);

  set(['server', 'host'], process.env.SERVER_HOST);
  set(['server', 'port'], process.env.PORT ?? process.env.SERVER_PORT);
  set(['server', 'allowedOrigins'], process.env.ALLOWED_ORIGINS);

  set(['database', 'host'], process.env.DB_HOST);
  set(['database', 'port'], process.env.DB_PORT);
  set(['database', 'user'], process.env.DB_USER);
  set(['database', 'password'], process.env.DB_PASSWORD);
  set(['database', 'name'], process.env.DB_NAME);
  set(['database', 'sslMode'], process.env.DB_SSL_MODE);
  set(['database', 'maxOpenConns'], process.env.DB_MAX_OPEN_CONNS);
  set(['database', 'maxIdleConns'], process.env.DB_MAX_IDLE_CONNS);
  set(['database', 'connMaxLifetime'], process.env.DB_CONN_MAX_LIFETIME);

  set(['redis', 'host'], process.env.REDIS_HOST);
  set(['redis', 'port'], process.env.REDIS_PORT);
  set(['redis', 'username'], process.env.REDIS_USERNAME);
  set(['redis', 'password'], process.env.REDIS_PASSWORD);
  set(['redis', 'db'], process.env.REDIS_DB);
  set(['redis', 'tls'], process.env.REDIS_TLS === 'true' ? true : undefined);

  set(['jwt', 'secret'], process.env.JWT_SECRET);
  set(['jwt', 'refreshSecret'], process.env.REFRESH_SECRET);
  set(['jwt', 'accessExpiryMins'], process.env.JWT_ACCESS_EXPIRY_MINS);
  set(['jwt', 'refreshExpiryDays'], process.env.JWT_REFRESH_EXPIRY_DAYS);

  set(['whatsapp', 'webhookVerifyToken'], process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  set(['whatsapp', 'apiVersion'], process.env.WHATSAPP_API_VERSION);
  set(['whatsapp', 'baseUrl'], process.env.WHATSAPP_BASE_URL);

  set(['ai', 'openaiKey'], process.env.OPENAI_API_KEY);
  set(['ai', 'anthropicKey'], process.env.ANTHROPIC_API_KEY);
  set(['ai', 'googleKey'], process.env.GOOGLE_AI_KEY);

  set(['storage', 'type'], process.env.STORAGE_TYPE);
  set(['storage', 'localPath'], process.env.STORAGE_LOCAL_PATH);
  set(['storage', 's3Bucket'], process.env.S3_BUCKET);
  set(['storage', 's3Region'], process.env.S3_REGION);
  set(['storage', 's3Key'], process.env.S3_ACCESS_KEY);
  set(['storage', 's3Secret'], process.env.S3_SECRET_KEY);
  set(['storage', 's3Endpoint'], process.env.S3_ENDPOINT);

  set(['rateLimit', 'enabled'], process.env.RATE_LIMIT_ENABLED === 'false' ? false : undefined);
  set(['rateLimit', 'loginMaxAttempts'], process.env.RATE_LIMIT_LOGIN_MAX);
  set(['rateLimit', 'windowSeconds'], process.env.RATE_LIMIT_WINDOW_SECONDS);

  set(['cookie', 'domain'], process.env.COOKIE_DOMAIN);
  set(['cookie', 'secure'], process.env.COOKIE_SECURE === 'true' ? true : undefined);

  set(['calling', 'publicIp'], process.env.CALLING_PUBLIC_IP);
  set(['calling', 'udpPortMin'], process.env.CALLING_UDP_PORT_MIN);
  set(['calling', 'udpPortMax'], process.env.CALLING_UDP_PORT_MAX);
  set(['calling', 'recordingEnabled'], process.env.CALLING_RECORDING_ENABLED === 'true' ? true : undefined);

  return cfg;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (srcVal === undefined || srcVal === null) continue;

    if (typeof srcVal === 'object' && !Array.isArray(srcVal)) {
      result[key] = deepMerge(
        (result[key] as Record<string, unknown>) ?? {},
        srcVal as Record<string, unknown>,
      );
    } else {
      result[key] = srcVal;
    }
  }

  return result;
}

function applyEnvironmentRules(config: Config): Config {
  if (config.app.environment === 'production') {
    config.cookie.secure = true;
    config.rateLimit.enabled = true;
  } else if (config.app.environment === 'development') {
    config.app.debug = true;
    config.rateLimit.enabled = process.env.RATE_LIMIT_ENABLED === 'true';
  }

  return config;
}

export function loadConfig(configPath?: string): Config {
  const tomlConfig = loadFromToml(configPath);
  const envConfig = loadFromEnv();
  const baseShape: Record<string, unknown> = {
    app: {
      encryptionKey: 'dev-only-32-byte-key-not-for-prod!!',
    },
    server: {},
    database: {},
    redis: {},
    jwt: {
      secret: 'dev-only-jwt-secret-32-characters-long!!',
      refreshSecret: 'dev-only-refresh-secret-32-chars-long!!',
    },
    whatsapp: {}, ai: {}, storage: {}, defaultAdmin: {},
    rateLimit: {}, cookie: {}, calling: {}, tts: {},
  };
  const merged = deepMerge(deepMerge(baseShape, tomlConfig), envConfig);

  const result = configSchema.safeParse(merged);

  if (!result.success) {
    const errors = result.error.issues
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return applyEnvironmentRules(result.data);
}

let instance: Config | null = null;

export function getConfig(configPath?: string): Config {
  if (!instance) {
    instance = loadConfig(configPath);
  }
  return instance;
}

export function resetConfig(): void {
  instance = null;
}


