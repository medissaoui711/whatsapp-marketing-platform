import { describe, it, expect } from 'vitest';
import {
  pickFields,
  buildWhereClause,
  buildDateRangeFilter,
} from '../../../packages/db/src/optimized/query-builder';

describe('pickFields', () => {
  it('should create a select object with true values', () => {
    const result = pickFields(['id', 'name', 'email']);
    expect(result).toEqual({ id: true, name: true, email: true });
  });

  it('should return empty object for empty array', () => {
    const result = pickFields([]);
    expect(result).toEqual({});
  });
});

describe('buildWhereClause', () => {
  it('should merge base with non-undefined filters', () => {
    const result = buildWhereClause(
      { organizationId: 'org-1' },
      { name: 'test', email: undefined, status: 'active' },
    );
    expect(result).toEqual({
      organizationId: 'org-1',
      name: 'test',
      status: 'active',
    });
  });

  it('should exclude null values', () => {
    const result = buildWhereClause({}, { name: null, email: 'a@b.com' });
    expect(result).toEqual({ email: 'a@b.com' });
  });

  it('should return base when all filters are undefined', () => {
    const result = buildWhereClause({ orgId: 'x' }, { name: undefined });
    expect(result).toEqual({ orgId: 'x' });
  });
});

describe('buildDateRangeFilter', () => {
  it('should create gte filter for startDate only', () => {
    const result = buildDateRangeFilter('createdAt', '2024-01-01');
    expect(result).toEqual({
      createdAt: { gte: new Date('2024-01-01') },
    });
  });

  it('should create lte filter for endDate only', () => {
    const result = buildDateRangeFilter('createdAt', undefined, '2024-12-31');
    expect(result).toEqual({
      createdAt: { lte: new Date('2024-12-31') },
    });
  });

  it('should create range filter for both dates', () => {
    const result = buildDateRangeFilter('createdAt', '2024-01-01', '2024-12-31');
    expect(result).toEqual({
      createdAt: {
        gte: new Date('2024-01-01'),
        lte: new Date('2024-12-31'),
      },
    });
  });

  it('should return undefined when no dates provided', () => {
    const result = buildDateRangeFilter('createdAt');
    expect(result).toBeUndefined();
  });
});
