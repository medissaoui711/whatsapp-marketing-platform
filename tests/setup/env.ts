process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/saas_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-minimum';
process.env.REFRESH_SECRET = 'test-refresh-secret-key-32-chars-minimum';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-minimum';
process.env.METRICS_TOKEN = 'test-metrics-token';
