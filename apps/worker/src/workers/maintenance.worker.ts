import { Worker } from 'bullmq';
import { prisma } from '@repo/db';
import { CleanupAuditLogsJob, JobResult, getRedisConnection } from '@repo/queue';
import { subDays } from 'date-fns';

export class MaintenanceWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'maintenance-jobs',
      async (job) => {
        switch (job.name) {
          case 'cleanup_audit_logs':
            return this.cleanupAuditLogs(job.data as CleanupAuditLogsJob);
          case 'cleanup_expired_sessions':
            return this.cleanupExpiredSessions();
          case 'cleanup_failed_jobs':
            return this.cleanupFailedJobs();
          default:
            return { success: false, error: `Unknown job type: ${job.name}` };
        }
      },
      {
        connection: getRedisConnection(),
        concurrency: 1,
      }
    );

    this.setupEventHandlers();
  }

  private async cleanupAuditLogs(job: CleanupAuditLogsJob): Promise<JobResult> {
    const { organizationId, olderThanDays } = job;
    const cutoffDate = subDays(new Date(), olderThanDays);

    const deleted = await prisma.auditLog.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`Deleted ${deleted.count} audit logs for organization ${organizationId}`);
    return { success: true, data: { deletedCount: deleted.count } };
  }

  private async cleanupExpiredSessions(): Promise<JobResult> {
    const deleted = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    console.log(`Deleted ${deleted.count} expired sessions`);
    return { success: true, data: { deletedCount: deleted.count } };
  }

  private async cleanupFailedJobs(): Promise<JobResult> {
    console.log('Cleaning up failed jobs...');
    return { success: true };
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Maintenance job ${job.name} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Maintenance job ${job?.name} failed:`, err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}


