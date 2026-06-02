import { dns } from 'node:dns/promises';
import * as net from 'node:net';

const INTERNAL_HOSTNAMES = [
  'localhost',
  'host.docker.internal',
  'host.containers.internal',
  'metadata.google.internal',
  '169.254.169.254',
];

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  }
  return false;
}

export async function validateWebhookURL(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'URL must use http or https protocol' };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (INTERNAL_HOSTNAMES.includes(hostname)) {
      return { valid: false, error: 'Internal hostnames are not allowed' };
    }

    if (net.isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      return { valid: true };
    }

    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateIP(addr.address)) {
          return { valid: false, error: 'Hostname resolves to a private IP address' };
        }
      }
    } catch {
      return { valid: false, error: 'Could not resolve hostname' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}


