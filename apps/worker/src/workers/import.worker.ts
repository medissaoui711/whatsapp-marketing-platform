import { Worker } from 'bullmq';
import { prisma } from '@repo/db';
import { ImportContactsJob, JobResult, getRedisConnection } from '@repo/queue';
import { getStorage } from '@repo/media';

export class ImportWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'import-jobs',
      async (job) => this.processImport(job.data as ImportContactsJob),
      {
        connection: getRedisConnection(),
        concurrency: 2,
      }
    );

    this.setupEventHandlers();
  }

  private async processImport(job: ImportContactsJob): Promise<JobResult> {
    const { organizationId, userId, fileKey, fileType, mapping, updateOnDuplicate } = job;

    try {
      const storage = getStorage();
      const fileBuffer = await storage.download(fileKey);
      const fileContent = fileBuffer.toString('utf-8');

      if (fileType !== 'csv') {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      const rows = this.parseCsv(fileContent);
      const contacts: any[] = [];

      for (const row of rows) {
        const contact: any = { organizationId };
        for (const [csvField, dbField] of Object.entries(mapping)) {
          if (row[csvField]) {
            contact[dbField] = row[csvField];
          }
        }
        if (contact.phoneNumber) {
          contacts.push(contact);
        }
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const contact of contacts) {
        const existing = await prisma.contact.findFirst({
          where: { organizationId, phoneNumber: contact.phoneNumber },
        });

        if (existing) {
          if (updateOnDuplicate) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: contact,
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.contact.create({ data: contact });
          created++;
        }
      }

      await prisma.auditLog.create({
        data: {
          userId,
          userName: 'System',
          action: 'import.completed',
          target: 'contacts',
          details: { created, updated, skipped, total: contacts.length },
          ip: 'system',
          organizationId,
        },
      });

      return { success: true, data: { created, updated, skipped, total: contacts.length } };
    } catch (error) {
      console.error('Import failed:', error);
      await prisma.auditLog.create({
        data: {
          userId,
          userName: 'System',
          action: 'import.failed',
          target: 'contacts',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          ip: 'system',
          organizationId,
        },
      });

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private parseCsv(content: string): Array<Record<string, string>> {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).map(line => {
      const cells = line.split(',').map(cell => cell.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? '';
      });
      return row;
    });
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Import job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Import job ${job?.id} failed:`, err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}


