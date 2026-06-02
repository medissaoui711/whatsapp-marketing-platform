export type SelectShape = Record<string, boolean | Record<string, unknown>>;

export function pickFields<T extends string>(fields: T[]): Record<T, true> {
  return fields.reduce((acc, f) => ({ ...acc, [f]: true as const }), {} as Record<T, true>);
}

export function paginateArgs(page: number, limit: number): { skip: number; take: number } {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildWhereClause(
  base: Record<string, unknown>,
  filters: Record<string, unknown | undefined>,
): Record<string, unknown> {
  const where = { ...base };
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      where[key] = value;
    }
  }
  return where;
}

export function buildDateRangeFilter(
  field: string,
  startDate?: Date | string,
  endDate?: Date | string,
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) return undefined;

  const range: Record<string, Date> = {};
  if (startDate) range.gte = new Date(startDate);
  if (endDate) range.lte = new Date(endDate);

  return { [field]: range };
}
