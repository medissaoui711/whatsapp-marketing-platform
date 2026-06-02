import { Hub } from '@repo/websocket';

let hubInstance: Hub | null = null;

export function setWebSocketHub(hub: Hub): void {
  hubInstance = hub;
}

export function getWebSocketHub(): Hub | null {
  return hubInstance;
}


