export interface CursorPaginationInput {
  cursor?: string;
  take: number;
  orderBy?: 'asc' | 'desc';
}

export interface OffsetPaginationInput {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorMeta {
  hasNext: boolean;
  nextCursor?: string;
  total: number;
}

export function buildCursorPaginationArgs(input: CursorPaginationInput) {
  const args: Record<string, unknown> = {
    take: input.take + 1,
    orderBy: { id: input.orderBy || 'desc' },
  };

  if (input.cursor) {
    args.cursor = { id: input.cursor };
    args.skip = 1;
  }

  return args;
}

export function parseCursorResults<T extends { id: string }>(
  results: T[],
  input: CursorPaginationInput,
): { items: T[]; meta: CursorMeta } {
  const hasNext = results.length > input.take;
  const items = hasNext ? results.slice(0, input.take) : results;
  const nextCursor = hasNext ? items[items.length - 1]?.id : undefined;

  return {
    items,
    meta: {
      hasNext,
      nextCursor,
      total: 0,
    },
  };
}

export function buildOffsetPaginationMeta(
  total: number,
  input: OffsetPaginationInput,
): PaginationMeta {
  return {
    total,
    page: input.page,
    limit: input.limit,
    totalPages: Math.ceil(total / input.limit),
    hasNext: input.page * input.limit < total,
    hasPrev: input.page > 1,
  };
}

export function buildOffsetSkip(input: OffsetPaginationInput): number {
  return (input.page - 1) * input.limit;
}
