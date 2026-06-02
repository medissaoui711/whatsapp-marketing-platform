import { chatLoadCounter, callLoadCounter, combinedLoadCounter } from './load-counters';
import type { LoadCounter } from './types';

export const ChatLoadCounter: LoadCounter = (db, orgId, agentIds) =>
  chatLoadCounter(db as any, orgId, agentIds);

export const CallLoadCounter: LoadCounter = (db, orgId, agentIds) =>
  callLoadCounter(db as any, orgId, agentIds);

export { chatLoadCounter, callLoadCounter, combinedLoadCounter };


