export interface BatchOptions {
  batchSize: number;
  concurrency?: number;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONCURRENCY = 5;

export async function processInBatches<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchOptions = { batchSize: DEFAULT_BATCH_SIZE },
): Promise<R[]> {
  const results: R[] = [];
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

export async function processInBatchesConcurrent<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchOptions = { batchSize: DEFAULT_BATCH_SIZE, concurrency: DEFAULT_CONCURRENCY },
): Promise<R[]> {
  const results: R[] = [];
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;

  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrentBatch = batches.slice(i, i + concurrency);
    const batchResults = await Promise.all(concurrentBatch.map(processor));
    for (const br of batchResults) {
      results.push(...br);
    }
  }

  return results;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
