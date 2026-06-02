import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let postgresContainer: StartedTestContainer | null = null;
let redisContainer: StartedTestContainer | null = null;

export async function startPostgresContainer(): Promise<string> {
  postgresContainer = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'saas_test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  const host = postgresContainer.getHost();
  const port = postgresContainer.getMappedPort(5432);
  const url = `postgresql://test:test@${host}:${port}/saas_test`;

  process.env.DATABASE_URL = url;
  return url;
}

export async function startRedisContainer(): Promise<string> {
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  const host = redisContainer.getHost();
  const port = redisContainer.getMappedPort(6379);
  const url = `redis://${host}:${port}`;

  process.env.REDIS_URL = url;
  return url;
}

export async function stopContainers(): Promise<void> {
  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
  }
  if (redisContainer) {
    await redisContainer.stop();
    redisContainer = null;
  }
}
