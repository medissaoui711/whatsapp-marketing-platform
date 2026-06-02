import { Worker } from 'bullmq';
import { prisma } from '@repo/db';
import { WhatsAppClient, PhoneRecipient } from '@repo/integrations';
import { decrypt } from '@repo/auth/encryption';
import { RecipientJob, JobResult, getRedisConnection } from '@repo/queue';

export class RecipientWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'recipient-jobs',
      async (job) => this.processRecipientJob(job.data as RecipientJob),
      {
        connection: getRedisConnection(),
        concurrency: 5,
        limiter: { max: 50, duration: 1000 },
      }
    );

    this.setupEventHandlers();
  }

  private async processRecipientJob(job: RecipientJob): Promise<JobResult> {
    const {
      campaignId,
      recipientId,
      organizationId,
      phoneNumber,
      recipientName,
      templateParams,
      headerParams,
    } = job;

    try {
      const campaign = await prisma.bulkMessageCampaign.findFirst({
        where: { id: campaignId, organizationId },
        include: { template: true },
      });

      if (!campaign) {
        await this.updateRecipientStatus(recipientId, 'failed', '', 'Campaign not found');
        await this.incrementCampaignCount(campaignId, 'failedCount');
        return { success: false, error: 'Campaign not found' };
      }

      if (campaign.status !== 'processing') {
        console.log(`Campaign ${campaignId} is ${campaign.status}, skipping recipient ${recipientId}`);
        return { success: true, message: 'Skipped - campaign not processing' };
      }

      const account = await prisma.whatsAppAccount.findFirst({
        where: { name: campaign.whatsappAccount, organizationId },
      });

      if (!account) {
        await this.updateRecipientStatus(recipientId, 'failed', '', 'WhatsApp account not found');
        await this.incrementCampaignCount(campaignId, 'failedCount');
        return { success: false, error: 'WhatsApp account not found' };
      }

      let contact = await prisma.contact.findFirst({
        where: { phoneNumber, organizationId },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            organizationId,
            phoneNumber,
            profileName: recipientName,
          },
        });
      }

      if (contact.marketingOptOut && campaign.template?.category === 'MARKETING') {
        await this.updateRecipientStatus(recipientId, 'failed', '', 'Contact opted out');
        await this.incrementCampaignCount(campaignId, 'failedCount');
        return { success: false, error: 'Contact opted out of marketing messages' };
      }

      const accessToken = decrypt(account.accessToken);
      const client = new WhatsAppClient(console);
      const waAccount = {
        phoneId: account.phoneId,
        businessId: account.businessId,
        apiVersion: account.apiVersion,
        accessToken,
      };

      const components = this.buildTemplateComponents(
        campaign.template,
        templateParams,
        headerParams,
        campaign.headerMediaId,
        campaign.headerMediaFilename,
      );

      const waMessageId = await client.sendTemplateMessage(
        waAccount,
        new PhoneRecipient(phoneNumber),
        campaign.template!.name,
        campaign.template!.language,
        components,
      );

      await prisma.message.create({
        data: {
          organizationId,
          whatsappAccount: campaign.whatsappAccount,
          contactId: contact.id,
          whatsappMessageId: waMessageId,
          direction: 'outgoing',
          messageType: 'template',
          templateParams,
          metadata: {
            campaign_id: campaignId,
            recipient_name: recipientName,
          },
          templateName: campaign.template?.name,
          content: this.replaceTemplateParams(campaign.template?.bodyContent || '', templateParams),
          status: 'sent',
        },
      });

      await this.updateRecipientStatus(recipientId, 'sent', waMessageId, '');
      await this.incrementCampaignCount(campaignId, 'sentCount');
      await this.checkCampaignCompletion(campaignId, organizationId);

      return { success: true, data: { waMessageId } };
    } catch (error) {
      console.error(`Failed to send message to ${phoneNumber}:`, error);
      await this.updateRecipientStatus(recipientId, 'failed', '', error instanceof Error ? error.message : 'Unknown error');
      await this.incrementCampaignCount(campaignId, 'failedCount');
      await this.checkCampaignCompletion(campaignId, organizationId);

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private buildTemplateComponents(
    template: any,
    bodyParams: Record<string, any>,
    headerParams: Record<string, any>,
    mediaId: string | null,
    mediaFilename: string | null,
  ): any[] {
    const components: any[] = [];

    if (template?.headerType && template.headerType !== 'NONE') {
      if (template.headerType === 'TEXT' && template.headerContent?.includes('{{')) {
        const paramNames = this.extractParamNames(template.headerContent);
        let headerValue = '';
        if (paramNames.length === 1) {
          const name = paramNames[0];
          headerValue = headerParams?.[name] || bodyParams?.[name] || '';
        }
        components.push({
          type: 'header',
          parameters: [{ type: 'text', text: headerValue }],
        });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.headerType) && mediaId) {
        const mediaType = template.headerType.toLowerCase();
        const mediaObj: any = { id: mediaId };
        if (mediaType === 'document' && mediaFilename) {
          mediaObj.filename = mediaFilename;
        }
        components.push({
          type: 'header',
          parameters: [{ type: mediaType, [mediaType]: mediaObj }],
        });
      }
    }

    const paramNames = this.extractParamNames(template?.bodyContent || '');
    const bodyParameters = paramNames.map(name => ({
      type: 'text',
      text: bodyParams?.[name] || '',
    }));

    if (bodyParameters.length > 0) {
      components.push({ type: 'body', parameters: bodyParameters });
    }

    return components;
  }

  private replaceTemplateParams(content: string, params: Record<string, any>): string {
    let result = content;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
    return result;
  }

  private extractParamNames(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, m => m[1].trim());
  }

  private async updateRecipientStatus(recipientId: string, status: string, waMessageId: string, errorMessage: string): Promise<void> {
    const updateData: any = { status };
    if (waMessageId) updateData.whatsappMessageId = waMessageId;
    if (status === 'sent') updateData.sentAt = new Date();
    if (errorMessage) updateData.errorMessage = errorMessage;

    await prisma.bulkMessageRecipient.update({
      where: { id: recipientId },
      data: updateData,
    });
  }

  private async incrementCampaignCount(campaignId: string, field: string): Promise<void> {
    const updateData: any = {}; 
    updateData[field] = { increment: 1 };
    await prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });
  }

  private async checkCampaignCompletion(campaignId: string, organizationId: string): Promise<void> {
    const pendingCount = await prisma.bulkMessageRecipient.count({
      where: { campaignId, status: 'pending' },
    });

    if (pendingCount === 0) {
      const campaign = await prisma.bulkMessageCampaign.findUnique({
        where: { id: campaignId },
      });

      if (campaign && campaign.status === 'processing') {
        await prisma.bulkMessageCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
        console.log(`Campaign ${campaignId} completed`);
      }
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}


