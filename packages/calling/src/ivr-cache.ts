import type Redis from 'ioredis';
import { prisma } from '@repo/db';

const IVR_FLOW_CACHE_PREFIX = 'ivr_flow:';
const IVR_FLOW_CFG_CACHE_PREFIX = 'ivr_flow:cfg:';
const ORG_SETTINGS_CACHE_PREFIX = 'org:calling_settings:';
const CACHE_TTL = 6 * 60 * 60;

export interface OrgCallingSettings {
  transferTimeoutSecs: number;
  holdMusicFile: string;
  ringbackFile: string;
  maskPhoneNumbers: boolean;
}

export interface CallRecorder {
  writePacket(payload: Buffer): void;
  close(): Promise<void>;
}

export async function getIVRFlowCached(
  redis: Redis,
  flowId: string
): Promise<Record<string, unknown> | null> {
  const key = `${IVR_FLOW_CACHE_PREFIX}${flowId}`;

  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as Record<string, unknown>;
  }

  const flow = await prisma.iVRFlow.findUnique({
    where: { id: flowId },
  });

  if (flow) {
    await redis.set(key, JSON.stringify(flow), 'EX', CACHE_TTL);
  }

  return flow as unknown as Record<string, unknown> | null;
}

export async function getIVRFlowByConfigCached(
  redis: Redis,
  orgId: string,
  accountName: string,
  configType: 'call_start' | 'outgoing_end'
): Promise<Record<string, unknown> | null> {
  const key = `${IVR_FLOW_CFG_CACHE_PREFIX}${orgId}:${accountName}:${configType}`;

  const cached = await redis.get(key);
  if (cached) {
    if (cached === 'null') return null;
    return JSON.parse(cached) as Record<string, unknown>;
  }

  const where: Record<string, unknown> = {
    organizationId: orgId,
    whatsappAccount: accountName,
    isActive: true,
  };

  if (configType === 'call_start') {
    where.isCallStart = true;
  } else {
    where.isOutgoingEnd = true;
  }

  const flow = await prisma.iVRFlow.findFirst({ where });

  await redis.set(key, flow ? JSON.stringify(flow) : 'null', 'EX', CACHE_TTL);

  return flow as unknown as Record<string, unknown> | null;
}

export async function getOrgCallingSettingsCached(
  redis: Redis,
  orgId: string,
  defaultSettings: OrgCallingSettings
): Promise<OrgCallingSettings> {
  const key = `${ORG_SETTINGS_CACHE_PREFIX}${orgId}`;

  const cached = await redis.get(key);
  if (cached) {
    const parsed = JSON.parse(cached) as Partial<OrgCallingSettings>;
    return { ...defaultSettings, ...parsed };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, unknown> | undefined;
  const overrides: Partial<OrgCallingSettings> = {};

  if (settings) {
    if (settings.maskPhoneNumbers !== undefined) overrides.maskPhoneNumbers = Boolean(settings.maskPhoneNumbers);
    if (settings.transferTimeoutSecs) overrides.transferTimeoutSecs = Number(settings.transferTimeoutSecs);
    if (settings.holdMusicFile) overrides.holdMusicFile = String(settings.holdMusicFile);
    if (settings.ringbackFile) overrides.ringbackFile = String(settings.ringbackFile);
  }

  const result = { ...defaultSettings, ...overrides };
  await redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL);

  return result;
}

export async function invalidateIVRFlowCache(
  redis: Redis,
  flowId: string,
  orgId: string,
  accountName: string
): Promise<void> {
  await redis.del(`${IVR_FLOW_CACHE_PREFIX}${flowId}`);
  await redis.del(`${IVR_FLOW_CFG_CACHE_PREFIX}${orgId}:${accountName}:call_start`);
  await redis.del(`${IVR_FLOW_CFG_CACHE_PREFIX}${orgId}:${accountName}:outgoing_end`);
}

export async function invalidateOrgCallingSettingsCache(
  redis: Redis,
  orgId: string
): Promise<void> {
  await redis.del(`${ORG_SETTINGS_CACHE_PREFIX}${orgId}`);
}


