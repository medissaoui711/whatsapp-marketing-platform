import { WhatsAppClient } from './client';
import { PhoneRecipient } from '../types/whatsapp';
import { prisma } from '@repo/db';
import { decrypt } from '@repo/auth/encryption';

export interface EducationalMessage {
  tenantId: string;
  userId: string;
  to: string;
  templateName: string;
  templateLanguage: string;
  parameters: Record<string, string>;
  campaignId?: string;
}

export class EducationalMessagingService {
  private clients: Map<string, WhatsAppClient> = new Map();

  constructor() {
    this.loadClients();
  }

  private async loadClients(): Promise<void> {
    const accounts = await prisma.whatsAppAccount.findMany({
      where: { isActive: true },
    });

    for (const account of accounts) {
      const client = new WhatsAppClient(console);
      this.clients.set(account.tenantId, client);
    }
  }

  async sendEducationalMessage(message: EducationalMessage): Promise<string> {
    const client = this.clients.get(message.tenantId);
    if (!client) {
      throw new Error(`No WhatsApp client configured for tenant ${message.tenantId}`);
    }

    const feature = await prisma.feature.findUnique({
      where: { key: 'whatsapp_educational_messaging', isEnabled: true },
    });

    if (!feature) {
      throw new Error('Educational messaging feature is not available');
    }

    const tenantFeature = await prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureId: {
          tenantId: message.tenantId,
          featureId: feature.id,
        },
      },
    });

    if (!tenantFeature || !tenantFeature.isActive) {
      throw new Error('Educational messaging is not enabled for this organization');
    }

    const settings = (tenantFeature.settings as Record<string, unknown>) || {};
    const dailyLimit = (settings.dailyLimit as number) || 100;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageToday = await prisma.featureUsage.count({
      where: {
        tenantId: message.tenantId,
        featureId: feature.id,
        createdAt: { gte: today },
      },
    });

    if (usageToday >= dailyLimit) {
      throw new Error(`Daily limit exceeded. Maximum ${dailyLimit} messages per day.`);
    }

    const template = await prisma.template.findFirst({
      where: {
        name: message.templateName,
        organizationId: message.tenantId,
        status: 'APPROVED',
      },
    });

    if (!template) {
      throw new Error(`Template ${message.templateName} not found or not approved`);
    }

    const account = await prisma.whatsAppAccount.findFirst({
      where: { tenantId: message.tenantId, isActive: true },
    });

    if (!account) {
      throw new Error('No active WhatsApp account found');
    }

    const accessToken = decrypt(account.accessToken);
    const waAccount = {
      phoneId: account.phoneId,
      businessId: account.businessId,
      apiVersion: account.apiVersion,
      accessToken,
    };

    const components = this.prepareTemplateComponents(template, message.parameters);

    const waMessageId = await client.sendTemplateMessage(
      waAccount,
      new PhoneRecipient(message.to),
      message.templateName,
      message.templateLanguage,
      components
    );

    let contact = await prisma.contact.findFirst({
      where: { phoneNumber: message.to, organizationId: message.tenantId },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          organizationId: message.tenantId,
          phoneNumber: message.to,
        },
      });
    }

    await prisma.message.create({
      data: {
        organizationId: message.tenantId,
        whatsappAccount: account.name || account.id,
        contactId: contact.id,
        whatsappMessageId: waMessageId,
        direction: 'outgoing',
        messageType: 'template',
        templateName: message.templateName,
        templateParams: message.parameters,
        content: this.renderTemplateContent(template.bodyContent, message.parameters),
        status: 'sent',
        sentByUserId: message.userId,
        metadata: {
          campaign_id: message.campaignId,
          feature: 'educational_messaging',
        },
      },
    });

    await prisma.featureUsage.create({
      data: {
        tenantId: message.tenantId,
        userId: message.userId,
        featureId: feature.id,
        action: 'send_message',
        metadata: {
          templateName: message.templateName,
          recipient: message.to,
          messageId: waMessageId,
        },
      },
    });

    await prisma.tenantFeature.update({
      where: { id: tenantFeature.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return waMessageId;
  }

  private prepareTemplateComponents(
    template: any,
    parameters: Record<string, string>
  ): any[] {
    const components: any[] = [];

    const bodyParamNames = this.extractParamNames(template.bodyContent || '');
    if (bodyParamNames.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParamNames.map((name: string) => ({
          type: 'text',
          text: parameters[name] || '',
        })),
      });
    }

    if (
      template.headerType &&
      template.headerType !== 'NONE' &&
      template.headerType === 'TEXT'
    ) {
      const headerParamNames = this.extractParamNames(template.headerContent || '');
      if (headerParamNames.length > 0) {
        components.push({
          type: 'header',
          parameters: headerParamNames.map((name: string) => ({
            type: 'text',
            text: parameters[name] || '',
          })),
        });
      }
    }

    return components;
  }

  private extractParamNames(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, m => m[1].trim());
  }

  private renderTemplateContent(
    content: string,
    params: Record<string, string>
  ): string {
    let result = content;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  async getMessageStats(tenantId: string, startDate: Date, endDate: Date) {
    const stats = await prisma.message.groupBy({
      by: ['status'],
      where: {
        organizationId: tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    return stats;
  }

  async getRemainingQuota(
    tenantId: string
  ): Promise<{ used: number; limit: number; remaining: number }> {
    const feature = await prisma.feature.findUnique({
      where: { key: 'whatsapp_educational_messaging' },
    });

    if (!feature) return { used: 0, limit: 0, remaining: 0 };

    const tenantFeature = await prisma.tenantFeature.findUnique({
      where: { tenantId_featureId: { tenantId, featureId: feature.id } },
    });

    const dailyLimit = ((tenantFeature?.settings as Record<string, unknown>)?.dailyLimit as number) || 100;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageToday = await prisma.featureUsage.count({
      where: {
        tenantId,
        featureId: feature.id,
        createdAt: { gte: today },
      },
    });

    return {
      used: usageToday,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - usageToday),
    };
  }
}
