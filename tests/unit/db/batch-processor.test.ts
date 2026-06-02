import { describe, it, expect, vi } from 'vitest';
import {
  processInBatches,
  processInBatchesConcurrent,
  chunkArray,
} from '../../../packages/db/src/optimized/batch-processor';

describe('chunkArray', () => {
  it('should split array into chunks of specified size', () => {
    const result = chunkArray([1, 2, 3, 4, 5, 6, 7], 3);
    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('should return single chunk for size larger than array', () => {
    const result = chunkArray([1, 2], 10);
    expect(result).toEqual([[1, 2]]);
  });

  it('should return empty array for empty input', () => {
    const result = chunkArray([], 5);
    expect(result).toEqual([]);
  });
});

describe('processInBatches', () => {
  it('should process all items in batches', async () => {
    const processor = vi.fn().mockImplementation(async (batch: number[]) =>
      batch.map(x => x * 2),
    );

    const results = await processInBatches([1, 2, 3, 4, 5], processor, { batchSize: 2 });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(processor).toHaveBeenCalledTimes(3);
  });

  it('should handle empty input', async () => {
    const processor = vi.fn();
    const results = await processInBatches([], processor, { batchSize: 10 });
    expect(results).toEqual([]);
    expect(processor).not.toHaveBeenCalled();
  });
});

describe('processInBatchesConcurrent', () => {
  it('should process batches concurrently', async () => {
    const processor = vi.fn().mockImplementation(async (batch: number[]) =>
      batch.map(x => x + 1),
    );

    const results = await processInBatchesConcurrent(
      [10, 20, 30, 40],
      processor,
      { batchSize: 2, concurrency: 2 },
    );

    expect(results).toEqual([11, 21, 31, 41]);
    expect(processor).toHaveBeenCalledTimes(2);
  });
});
