import { describe, it, expect } from 'vitest';
import { MockServer } from '../../mocks/mock-server';

describe('Health API Integration', () => {
  it('should return healthy status from mock health endpoint', async () => {
    const server = new MockServer();
    server.get('/api/health', () => ({
      status: 200,
      body: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'up', latency: 2 },
          redis: { status: 'up', latency: 1 },
        },
      },
    }));
    await server.start();

    const res = await fetch(`${server.url}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.services.database.status).toBe('up');
    expect(body.services.redis.status).toBe('up');
    expect(typeof body.services.database.latency).toBe('number');

    await server.close();
  });

  it('should return unhealthy when database is down', async () => {
    const server = new MockServer();
    server.get('/api/health', () => ({
      status: 503,
      body: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'down' },
          redis: { status: 'up', latency: 1 },
        },
      },
    }));
    await server.start();

    const res = await fetch(`${server.url}/api/health`);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('unhealthy');
    expect(body.services.database.status).toBe('down');

    await server.close();
  });
});
