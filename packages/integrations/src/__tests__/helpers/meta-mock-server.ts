import { createServer, Server } from 'http';

export interface MetaMockServerConfig {
  phoneDetailsFn?: (path: string) => { status: number; body: unknown };
  bizInfoFn?: (path: string) => { status: number; body: unknown };
  phoneNumbersFn?: (path: string) => { status: number; body: unknown };
  subscribeFn?: (path: string) => { status: number; body: unknown };
  wabalLimitFn?: (path: string) => { status: number; body: unknown };
}

export class MetaMockServer {
  private server: Server;
  public hits: Map<string, number> = new Map();
  public url: string = '';
  private config: MetaMockServerConfig;

  constructor(config: MetaMockServerConfig = {}) {
    this.config = config;

    this.server = createServer((req, res) => {
      const path = req.url || '';

      this.hits.set(path, (this.hits.get(path) || 0) + 1);

      let response: { status: number; body: unknown };

      if (path.includes('whatsapp_business_manager_messaging_limit') && !path.includes('display_phone_number')) {
        response = this.config.wabalLimitFn
          ? this.config.wabalLimitFn(path)
          : { status: 200, body: { whatsapp_business_manager_messaging_limit: 'TIER_10K' } };
      } else if (path.includes('/subscribed_apps')) {
        response = this.config.subscribeFn
          ? this.config.subscribeFn(path)
          : { status: 200, body: { success: true } };
      } else if (path.includes('/phone_numbers')) {
        response = this.config.phoneNumbersFn
          ? this.config.phoneNumbersFn(path)
          : { status: 200, body: { data: [] } };
      } else if (path.includes('fields=id,name')) {
        response = this.config.bizInfoFn
          ? this.config.bizInfoFn(path)
          : { status: 200, body: { id: 'biz', name: 'Biz Co' } };
      } else {
        response = this.config.phoneDetailsFn
          ? this.config.phoneDetailsFn(path)
          : {
              status: 200,
              body: {
                display_phone_number: '+1234567890',
                verified_name: 'Test',
                account_mode: 'LIVE',
                code_verification_status: 'VERIFIED',
                quality_rating: 'GREEN',
                messaging_limit_tier: 'TIER_250',
              },
            };
      }

      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response.body));
    });
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

  getHitCount(path: string): number {
    return this.hits.get(path) || 0;
  }

  resetHits(): void {
    this.hits.clear();
  }
}


