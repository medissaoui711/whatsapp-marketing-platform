import { describe, it, expect } from 'vitest';
import {
  buildCursorPaginationArgs,
  parseCursorResults,
  buildOffsetPaginationMeta,
  buildOffsetSkip,
} from '../../../packages/db/src/optimized/pagination';

describe('CursorPagination', () => {
  describe('buildCursorPaginationArgs', () => {
    it('should build args without cursor', () => {
      const args = buildCursorPaginationArgs({ take: 20 });
      expect(args).toEqual({
        take: 21,
        orderBy: { id: 'desc' },
      });
    });

    it('should build args with cursor', () => {
      const args = buildCursorPaginationArgs({ take: 10, cursor: 'abc-123' });
      expect(args).toEqual({
        take: 11,
        cursor: { id: 'abc-123' },
        skip: 1,
        orderBy: { id: 'desc' },
      });
    });

    it('should support ascending order', () => {
      const args = buildCursorPaginationArgs({ take: 5, orderBy: 'asc' });
      expect(args.orderBy).toEqual({ id: 'asc' });
    });
  });

  describe('parseCursorResults', () => {
    it('should return items when fewer than take+1', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const { items: result, meta } = parseCursorResults(items, { take: 10 });
      expect(result).toHaveLength(2);
      expect(meta.hasNext).toBe(false);
      expect(meta.nextCursor).toBeUndefined();
    });

    it('should detect hasNext and provide cursor', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
      const { items: result, meta } = parseCursorResults(items, { take: 3 });
      expect(result).toHaveLength(3);
      expect(meta.hasNext).toBe(true);
      expect(meta.nextCursor).toBe('3');
    });

    it('should return empty array for no results', () => {
      const { items, meta } = parseCursorResults([], { take: 10 });
      expect(items).toHaveLength(0);
      expect(meta.hasNext).toBe(false);
    });
  });
});

describe('OffsetPagination', () => {
  describe('buildOffsetPaginationMeta', () => {
    it('should calculate pagination metadata', () => {
      const meta = buildOffsetPaginationMeta(100, { page: 3, limit: 20 });
      expect(meta).toEqual({
        total: 100,
        page: 3,
        limit: 20,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle first page', () => {
      const meta = buildOffsetPaginationMeta(50, { page: 1, limit: 10 });
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
    });

    it('should handle last page', () => {
      const meta = buildOffsetPaginationMeta(30, { page: 3, limit: 10 });
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle empty results', () => {
      const meta = buildOffsetPaginationMeta(0, { page: 1, limit: 20 });
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });
  });

  describe('buildOffsetSkip', () => {
    it('should calculate correct skip values', () => {
      expect(buildOffsetSkip({ page: 1, limit: 20 })).toBe(0);
      expect(buildOffsetSkip({ page: 2, limit: 20 })).toBe(20);
      expect(buildOffsetSkip({ page: 5, limit: 10 })).toBe(40);
    });
  });
});
