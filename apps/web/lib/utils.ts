import { type ClassValue, clsx } from 'clsx'
import { prisma } from '@repo/db';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 2) + '****' + phone.slice(-2);
}

export function maskIfPhoneNumber(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (/^\+?\d+$/.test(value)) return maskPhoneNumber(value);
  return value;
}

export async function shouldMaskPhoneNumbers(orgId: string): Promise<boolean> {
  const setting = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });
  if (!setting) return false;
  return (setting.settings as any)?.maskPhoneNumbers === true;
}

export const utils = {
  maskPhoneNumber,
  maskIfPhoneNumber,
  shouldMaskPhoneNumbers,
};


