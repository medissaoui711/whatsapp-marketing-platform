export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function parsePaginationParams(params: Record<string, string | string[] | undefined>) {
  return {
    page: Math.max(1, Number(params.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(params.pageSize) || 10)),
    sortBy: (params.sortBy as string) || 'createdAt',
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
  }
}


