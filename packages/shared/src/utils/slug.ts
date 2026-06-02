import { generateRandomString } from './general';

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(str: string, length: number = 8): string {
  const base = slugify(str);
  const random = generateRandomString(length);
  return `${base}-${random}`;
}

export function normalizeTemplateName(name: string): string {
  let result = name.toLowerCase();
  result = result.replace(/\s+/g, '_');
  result = result.replace(/-/g, '_');
  result = result.replace(/[^a-z0-9_]/g, '');
  return result;
}

export function isValidTemplateName(name: string): boolean {
  const regex = /^[a-z][a-z0-9_]{0,511}$/;
  return regex.test(name);
}


