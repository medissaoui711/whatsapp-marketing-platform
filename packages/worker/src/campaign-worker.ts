import { Worker as BullWorker, Job } from 'bullmq';
import { prisma } from '@repo/db';
import { decrypt } from '@repo/auth/encryption';
import { WhatsAppClient, PhoneRecipient } from '@repo/integrations';
import { Publisher } from '@repo/queue';
import { RECIPIENT_QUEUE } from '@repo/queue';
import type { RecipientJob } from '@repo/queue';

export interface CampaignWorkerConfig {
  redisUrl: string;
  concurrency?: number;
}

export class CampaignWorker {
  private worker: BullWorker;
  private whatsappClient: WhatsAppClient;
  private publisher: Publisher;

  constructor(config: CampaignWorkerConfig) {
    this.whatsappClient = new WhatsAppClient(console);
    this.publisher = new Publisher(config.redisUrl);

    this.worker = new BullWorker(
      RECIPIENT_QUEUE,
      async (job: Job) => {
        await this.processRecipientJob(job.data as RecipientJob);
      },
      {
        connection: { url: config.redisUrl },
        concurrency: config.concurrency || 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[CampaignWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[CampaignWorker] Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('[CampaignWorker] Worker error:', err);
    });
  }

  private async processRecipientJob(job: RecipientJob): Promise<void> {
    const { campaignId, recipientId, organizationId, phoneNumber, recipientName, templateParams, headerParams } = job;

    const campaign = await prisma.bulkMessageCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { template: true },
    });

    if (!campaign) {
      console.error(`[CampaignWorker] Campaign not found: ${campaignId}`);
      await this.updateRecipientStatus(recipientId, 'failed', '', 'Campaign not found');
      await this.incrementCampaignCount(campaignId, 'failedCount');
      return;
    }

    if (campaign.status === 'paused' || campaign.status === 'cancelled') {
      console.log(`[CampaignWorker] Campaign ${campaignId} is ${campaign.status}, skipping recipient ${recipientId}`);
      return;
    }

    const account = await prisma.whatsAppAccount.findFirst({
      where: { name: campaign.whatsappAccount, organizationId },
    });

    if (!account) {
      console.error(`[CampaignWorker] WhatsApp account not found: ${campaign.whatsappAccount}`);
      await this.updateRecipientStatus(recipientId, 'failed', '', 'WhatsApp account not found');
      await this.incrementCampaignCount(campaignId, 'failedCount');
      return;
    }

    const accessToken = decrypt(account.accessToken);

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
      console.log(`[CampaignWorker] Skipping marketing message for opted-out contact: ${contact.id}`);
      await this.updateRecipientStatus(recipientId, 'failed', '', 'Contact opted out of marketing messages');
      await this.incrementCampaignCount(campaignId, 'failedCount');
      return;
    }

    try {
      const waMessageId = await this.sendTemplateMessage(
        account,
        campaign.template,
        phoneNumber,
        accessToken,
        templateParams as Record<string, any>,
        headerParams as Record<string, any>,
        campaign.headerMediaId,
        campaign.headerMediaFilename,
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
          metadata: { campaign_id: campaignId, recipient_name: recipientName },
          templateName: campaign.template?.name,
          content: this.replaceTemplateParams(campaign.template?.bodyContent || '', templateParams as Record<string, any>),
          mediaUrl: campaign.headerMediaLocalPath,
          mediaMimeType: campaign.headerMediaMimeType,
          status: 'sent',
        },
      });

      await this.updateRecipientStatus(recipientId, 'sent', waMessageId, '');
      await this.incrementCampaignCount(campaignId, 'sentCount');

      console.log(`[CampaignWorker] Message sent to ${phoneNumber}, WA ID: ${waMessageId}`);
    } catch (error) {
      console.error(`[CampaignWorker] Failed to send to ${phoneNumber}:`, error);
      await this.updateRecipientStatus(recipientId, 'failed', '', error instanceof Error ? error.message : 'Unknown error');
      await this.incrementCampaignCount(campaignId, 'failedCount');
    }

    await this.checkCampaignCompletion(campaignId, organizationId);
  }

  private async sendTemplateMessage(
    account: any,
    template: any,
    phoneNumber: string,
    accessToken: string,
    templateParams: Record<string, any>,
    headerParams: Record<string, any>,
    campaignHeaderMediaId: string | null,
    campaignHeaderMediaFilename: string | null,
  ): Promise<string> {
    const waAccount = {
      phoneId: account.phoneId,
      businessId: account.businessId,
      apiVersion: account.apiVersion,
      accessToken,
    };

    const recipient = new PhoneRecipient(phoneNumber);

    const components: any[] = [];

    if (template.headerType && template.headerType !== 'NONE') {
      if (template.headerType === 'TEXT' && template.headerContent?.includes('{{')) {
        const paramNames = this.extractParamNames(template.headerContent);
        let headerValue = '';
        if (paramNames.length === 1) {
          const name = paramNames[0];
          headerValue = headerParams?.[name] || templateParams?.[name] || '';
        }
        components.push({
          type: 'header',
          parameters: [{ type: 'text', text: headerValue }],
        });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.headerType) && campaignHeaderMediaId) {
        const mediaType = template.headerType.toLowerCase();
        const mediaObj: any = { id: campaignHeaderMediaId };
        if (mediaType === 'document' && campaignHeaderMediaFilename) {
          mediaObj.filename = campaignHeaderMediaFilename;
        }
        components.push({
          type: 'header',
          parameters: [{ type: mediaType, [mediaType]: mediaObj }],
        });
      }
    }

    const paramNames = this.extractParamNames(template.bodyContent);
    const bodyParams = paramNames.map(name => ({
      type: 'text',
      text: templateParams[name] || '',
    }));
    components.push({ type: 'body', parameters: bodyParams });

    if (template.buttons?.length) {
      const buttons = template.buttons.map((btn: any) => {
        const button: any = { type: btn.type };
        if (btn.text) button.text = btn.text;
        if (btn.url) button.url = btn.url;
        if (btn.phone_number) button.phone_number = btn.phone_number;
        return button;
      });
      components.push({ type: 'buttons', buttons });
    }

    const waMessageId = await this.whatsappClient.sendTemplateMessage(
      waAccount,
      recipient,
      template.name,
      template.language,
      components,
    );

    return waMessageId;
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

  private async updateRecipientStatus(
    recipientId: string,
    status: string,
    waMessageId: string,
    errorMessage: string,
  ): Promise<void> {
    const updateData: any = { status, whatsappMessageId: waMessageId };
    if (status === 'sent') {
      updateData.sentAt = new Date();
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
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

  private async publishStats(campaignId: string, organizationId: string): Promise<void> {
    const campaign = await prisma.bulkMessageCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) return;

    await this.publisher.publishCampaignStats({
      campaignId,
      organizationId,
      status: campaign.status as any,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      readCount: campaign.readCount,
      failedCount: campaign.failedCount,
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
          data: { status: 'completed', completedAt: new Date() },
        });

        console.log(`[CampaignWorker] Campaign ${campaignId} completed`);
        await this.publishStats(campaignId, organizationId);
      }
    } else {
      await this.publishStats(campaignId, organizationId);
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.publisher.close();
  }

  getWorker(): BullWorker {
    return this.worker;
  }
}


