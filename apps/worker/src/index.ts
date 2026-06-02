import { closeHealthServer } from './health';
import { RecipientWorker } from './workers/recipient.worker';
import { WebhookWorker } from './workers/webhook.worker';
import { ImportWorker } from './workers/import.worker';
import { CampaignStatsWorker } from './workers/campaign-stats.worker';
import { MaintenanceWorker } from './workers/maintenance.worker';
import { LinkedInWorker } from './workers/linkedin/linkedin.worker';
import { EducationalMessageWorker } from './workers/educational-message.worker';

async function main() {
  console.log('[Worker] Starting...');

  const recipientWorker = new RecipientWorker();
  const webhookWorker = new WebhookWorker();
  const importWorker = new ImportWorker();
  const campaignStatsWorker = new CampaignStatsWorker();
  const maintenanceWorker = new MaintenanceWorker();
  const linkedinWorker = new LinkedInWorker();
  const educationalMessageWorker = new EducationalMessageWorker();

  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    await recipientWorker.close();
    await webhookWorker.close();
    await importWorker.close();
    await campaignStatsWorker.close();
    await maintenanceWorker.close();
    await linkedinWorker.close();
    await educationalMessageWorker.close();
    await closeHealthServer();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('[Worker] Ready to process jobs');
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});


