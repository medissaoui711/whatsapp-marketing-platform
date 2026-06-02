import { logAudit } from './index';
import type { AuditAction } from './index';

let auditQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (auditQueue.length > 0) {
    const task = auditQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('Audit log failed:', error);
      }
    }
  }

  isProcessing = false;
}

export function logAuditAsync(
  organizationId: string,
  userId: string,
  userName: string,
  resourceType: string,
  resourceId: string,
  action: AuditAction,
  oldData: unknown,
  newData: unknown,
  ip?: string,
  extraSkipFields?: Set<string>
): void {
  auditQueue.push(async () => {
    const { computeChanges } = await import('./index');
    const changes = computeChanges(oldData, newData, extraSkipFields);
    if (action === 'updated' && changes.length === 0) return;
    await logAudit(userId, userName, resourceType, resourceId, action, changes, organizationId);
  });

  setImmediate(() => processQueue());
}


