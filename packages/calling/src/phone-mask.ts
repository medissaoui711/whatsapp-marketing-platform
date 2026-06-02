import type Redis from 'ioredis';
import { getOrgCallingSettingsCached } from './ivr-cache';
import type { OrgCallingSettings } from './ivr-cache';

export async function maybeMaskPhone(
  redis: Redis,
  orgId: string,
  phone: string,
  defaultSettings: OrgCallingSettings
): Promise<string> {
  const settings = await getOrgCallingSettingsCached(redis, orgId, defaultSettings);
  if (!settings.maskPhoneNumbers) {
    return phone;
  }
  return maskPhoneNumber(phone);
}

function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length <= 4) return phone;
  const maskedLength = phone.length - 4;
  return '*'.repeat(maskedLength) + phone.slice(-4);
}


