import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

export type MockHandler = (req: IncomingMessage, path: string) => {
  status: number;
  headers?: Record<string, string>;
  body: unknown;
};

export class MockServer {
  private server: Server;
  private handlers: Map<string, MockHandler> = new Map();
  public hits: Map<string, number> = new Map();
  public url: string = '';

  constructor() {
    this.server = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathWithQuery = url.pathname + url.search;
      const pathname = url.pathname;
      const method = req.method || 'GET';
      const key = `${method}:${pathWithQuery}`;

      this.hits.set(key, (this.hits.get(key) || 0) + 1);

      const handler = this.findHandler(method, pathname, pathWithQuery);

      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'no handler', path: pathWithQuery }));
        return;
      }

      const response = handler(req, pathWithQuery);
      res.writeHead(response.status, {
        'Content-Type': 'application/json',
        ...response.headers,
      });
      res.end(JSON.stringify(response.body));
    });
  }

  private pathToRegex(pattern: string): RegExp {
    const normalized = pattern.startsWith('/') ? pattern : `/?${pattern}`;
    const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '[^/]+');
    return new RegExp(`^${regexStr}$`);
  }

  private findHandler(method: string, pathname: string, pathWithQuery: string): MockHandler | undefined {
    const exact = this.handlers.get(`${method}:${pathWithQuery}`);
    if (exact) return exact;

    const exactPathname = this.handlers.get(`${method}:${pathname}`);
    if (exactPathname) return exactPathname;

    for (const [key, handler] of this.handlers) {
      const [handlerMethod, handlerPath] = key.split(':', 2);
      if (handlerMethod !== method) continue;

      if (handlerPath.includes('*')) {
        const regex = this.pathToRegex(handlerPath);
        if (regex.test(pathname)) return handler;
      }
    }

    return undefined;
  }

  on(method: string, path: string, handler: MockHandler): void {
    const cleanPath = path.split('?')[0];
    this.handlers.set(`${method}:${cleanPath}`, handler);
  }

  get(path: string, handler: MockHandler): void {
    this.on('GET', path, handler);
  }

  post(path: string, handler: MockHandler): void {
    this.on('POST', path, handler);
  }

  put(path: string, handler: MockHandler): void {
    this.on('PUT', path, handler);
  }

  delete(path: string, handler: MockHandler): void {
    this.on('DELETE', path, handler);
  }

  getHitCount(method: string, path: string): number {
    return this.hits.get(`${method}:${path}`) || 0;
  }

  resetHits(): void {
    this.hits.clear();
  }

  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.listen(0, () => {
        const addr = this.server.address();
        if (typeof addr === 'object' && addr) {
          this.url = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
