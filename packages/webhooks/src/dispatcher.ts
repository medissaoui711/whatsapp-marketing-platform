import crypto from 'crypto';
import { prisma } from '@repo/db';
import { getCache, CACHE_TTL, CACHE_PREFIX } from '@repo/cache';
import type { WebhookCache } from '@repo/cache';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  organizationId: string;
  data: Record<string, any>;
}

export interface WebhookDispatchResult {
  webhookId: string;
  success: boolean;
  responseCode: number | null;
  errorMessage: string | null;
  attempts: number;
}

interface PendingWorker {
  promise: Promise<void>;
  resolve: () => void;
}

const MAX_CONCURRENT = 10;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 10_000;

let activeWorkers = 0;
const pendingQueue: Array<() => Promise<void>> = [];
const waiters: Array<() => void> = [];

export function __resetModuleState(): void {
  activeWorkers = 0;
  pendingQueue.length = 0;
  waiters.length = 0;
}

export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

async function getWebhooksCached(orgId: string): Promise<WebhookCache[]> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.WEBHOOKS}${orgId}`;

  if (cache.isReady()) {
    const cached = await cache.get<WebhookCache[]>(cacheKey);
    if (cached) return cached;
  }

  const webhooks = await prisma.webhook.findMany({
    where: { organizationId: orgId, isActive: true },
  });

  const data: WebhookCache[] = webhooks.map(w => ({
    id: w.id,
    organizationId: w.organizationId,
    name: w.name,
    url: w.url,
    events: w.events as string[],
    headers: w.headers as Record<string, string>,
    secret: w.secret || undefined,
    isActive: w.isActive,
  }));

  if (cache.isReady()) {
    await cache.set(cacheKey, data, CACHE_TTL.WEBHOOKS);
  }

  return data;
}

export async function dispatchWebhook(
  organizationId: string,
  event: string,
  data: Record<string, any>,
): Promise<WebhookDispatchResult[]> {
  const webhooks = await getWebhooksCached(organizationId);
  const matched = webhooks.filter(w => w.isActive && w.events.includes(event));

  if (matched.length === 0) return [];

  const results: WebhookDispatchResult[] = [];
  const workers: Array<() => Promise<void>> = matched.map(webhook => () =>
    dispatchToWebhook(webhook, event, data, results),
  );

  return runWithConcurrency(workers, results);
}

async function runWithConcurrency(
  workers: Array<() => Promise<void>>,
  results: WebhookDispatchResult[],
): Promise<WebhookDispatchResult[]> {
  const promises: Promise<void>[] = [];

  for (const worker of workers) {
    const promise = runScheduled(worker);
    promises.push(promise);
  }

  await Promise.all(promises);
  return results;
}

async function runScheduled(worker: () => Promise<void>): Promise<void> {
  if (activeWorkers < MAX_CONCURRENT) {
    return runWorker(worker);
  }

  return new Promise<void>(resolve => {
    pendingQueue.push(async () => {
      await runWorker(worker);
      resolve();
    });
  });
}

async function runWorker(worker: () => Promise<void>): Promise<void> {
  activeWorkers++;
  try {
    await worker();
  } finally {
    activeWorkers--;
    scheduleNext();
  }
}

function scheduleNext(): void {
  if (pendingQueue.length > 0 && activeWorkers < MAX_CONCURRENT) {
    const next = pendingQueue.shift()!;
    runWorker(next);
  }

  if (activeWorkers === 0 && pendingQueue.length === 0) {
    notifyWaiters();
  }
}

async function dispatchToWebhook(
  webhook: WebhookCache,
  event: string,
  data: Record<string, any>,
  results: WebhookDispatchResult[],
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    organizationId: webhook.organizationId,
    data,
  };

  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'SaaS-Platform-Webhook/1.0',
    'X-Webhook-Event': event,
    'X-Webhook-Timestamp': payload.timestamp,
    'X-Webhook-Signature': '',
    ...(webhook.headers || {}),
  };

  if (webhook.secret) {
    headers['X-Webhook-Signature'] = generateWebhookSignature(body, webhook.secret);
  }

  let lastError: string | null = null;
  let lastCode: number | null = null;
  let attempts = 0;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    attempts++;
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      lastCode = response.status;

      if (response.ok) {
        lastError = null;
        break;
      }

      lastError = `HTTP ${response.status}`;
      if (retry < MAX_RETRIES - 1) {
        await sleep(1000 * (retry + 1));
      }
    } catch (err: any) {
      lastError = err.name === 'TimeoutError' ? 'Request timeout' : (err.message || 'Unknown error');
      if (retry < MAX_RETRIES - 1) {
        await sleep(1000 * (retry + 1));
      }
    }
  }

  if (lastError !== null && attempts >= MAX_RETRIES) {
    lastError = `Max retries exceeded: ${lastError}`;
  }

  const success = lastError === null;
  const result: WebhookDispatchResult = {
    webhookId: webhook.id,
    success,
    responseCode: lastCode,
    errorMessage: success ? null : lastError,
    attempts,
  };
  results.push(result);

  await logDelivery(webhook.id, success, lastError, body, lastCode);
}

async function logDelivery(
  webhookId: string,
  success: boolean,
  errorMessage: string | null,
  payload: string,
  responseCode: number | null,
): Promise<void> {
  try {
    await prisma.webhookDeliveryLog.create({
      data: {
        webhookId,
        success,
        errorMessage: errorMessage ?? (success ? null : 'Unknown error'),
        payload,
        sentAt: new Date(),
        responseCode,
      },
    });
  } catch {
    // Logging failure should not disrupt dispatch
  }
}

export async function waitForWebhooks(): Promise<void> {
  if (activeWorkers === 0 && pendingQueue.length === 0) return;

  return new Promise<void>(resolve => {
    waiters.push(resolve);
  });
}

function notifyWaiters(): void {
  while (waiters.length > 0) {
    const waiter = waiters.shift()!;
    waiter();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


