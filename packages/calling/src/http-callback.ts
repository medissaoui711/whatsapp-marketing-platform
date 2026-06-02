import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface HTTPCallbackResult {
  statusCode: number;
  body: string;
}

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export async function executeHTTPCallback(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<HTTPCallbackResult> {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS protocols are allowed');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Internal addresses are not allowed');
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    timeout: timeoutMs,
  };

  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        if (data.length + chunk.length > 64 * 1024) {
          req.destroy();
          reject(new Error('Response body exceeds 64KB limit'));
          return;
        }
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: data,
        });
      });
    });

    req.on('error', reject);

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}


