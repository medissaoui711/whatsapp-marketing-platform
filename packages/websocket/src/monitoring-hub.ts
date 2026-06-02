import type { Hub } from './hub';
import type { ScraperEvent } from './types';

export class ScraperMonitor {
  private hub: Hub;

  constructor(hub: Hub) {
    this.hub = hub;
  }

  publish(event: ScraperEvent): void {
    this.hub.broadcastToOrg(event.tenantId, {
      type: event.type.toLowerCase(),
      payload: {
        jobId: event.jobId,
        data: event.data,
        timestamp: event.timestamp,
      },
    });
  }
}
