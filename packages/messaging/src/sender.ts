import { prisma } from '@repo/db';
import { WhatsAppClient, PhoneRecipient } from '@repo/integrations';
import { decrypt } from '@repo/auth/encryption';
import { dispatchWebhook } from '@repo/webhooks';
import { Hub } from '@repo/websocket';
import { randomUUID } from 'crypto';
import type { OutgoingMessageRequest, MessageSendOptions, MessageEventData } from '@repo/shared/src/schemas/message-sender';

export type BroadcastCallback = (orgId: string, type: string, payload: unknown) => void;

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 10000;

export class MessageSender {
  private whatsappClient: WhatsAppClient;

  constructor(private broadcastFn?: BroadcastCallback) {
    this.whatsappClient = new WhatsAppClient();
  }

  setBroadcastFn(fn: BroadcastCallback): void {
    this.broadcastFn = fn;
  }

  private toWhatsAppAccount(account: any): any {
    return {
      phoneId: account.phoneId,
      businessId: account.businessId,
      apiVersion: account.apiVersion,
      accessToken: decrypt(account.accessToken),
      appId: account.appId,
    };
  }

  private getMessagePreview(req: OutgoingMessageRequest): string {
    const truncate = (s: string, max: number) =>
      s.length > max ? s.slice(0, max - 3) + '...' : s;

    switch (req.type) {
      case 'text':
        return truncate(req.content || '', 100);
      case 'image':
        return req.caption ? truncate(req.caption, 100) : '[Image]';
      case 'video':
        return req.caption ? truncate(req.caption, 100) : '[Video]';
      case 'audio':
        return '[Audio]';
      case 'document':
        return req.mediaFilename ? `[Document: ${req.mediaFilename}]` : '[Document]';
      case 'interactive':
      case 'flow':
        return truncate(req.bodyText || '', 100);
      case 'template':
        return req.template?.displayName ? `[Template: ${req.template.displayName}]` : '[Template]';
      default:
        return '[Message]';
    }
  }

  private buildInteractiveData(req: OutgoingMessageRequest): Record<string, any> {
    if (req.template && req.template.buttons?.length) {
      const buttons = req.template.buttons.map((btn: any, i: number) => {
        const resolved = { ...btn };
        if (resolved.type === 'URL' && resolved.url && req.buttonUrlParams?.[String(i)]) {
          resolved.url = resolved.url.replace(/\{\{(\d+)\}\}/g, req.buttonUrlParams[String(i)]);
        }
        return resolved;
      });
      return { type: 'button', buttons };
    }

    switch (req.interactiveType) {
      case 'cta_url':
        return {
          type: 'cta_url',
          body: req.bodyText,
          buttonText: req.buttonText,
          url: req.url,
        };
      case 'voice_call': {
        const out: any = {
          type: 'voice_call',
          body: req.bodyText,
          displayText: req.displayText,
        };
        if (req.ttlMinutes && req.ttlMinutes > 0) out.ttlMinutes = req.ttlMinutes;
        return out;
      }
      case 'list':
        return {
          type: 'list',
          body: req.bodyText,
          rows: req.buttons?.map(btn => ({ id: btn.id, title: btn.title })) || [],
        };
      default:
        return {
          type: 'button',
          body: req.bodyText,
          buttons: req.buttons?.map(btn => ({ id: btn.id, title: btn.title })) || [],
        };
    }
  }

  private createOutgoingMessage(req: OutgoingMessageRequest, opts: MessageSendOptions): any {
    const msg: any = {
      id: randomUUID(),
      organizationId: req.account.organizationId,
      whatsappAccount: req.account.name,
      contactId: req.contact.id,
      direction: 'outgoing',
      messageType: req.type,
      status: 'pending',
      sentByUserId: opts.sentByUserId,
    };

    switch (req.type) {
      case 'text':
        msg.content = req.content;
        break;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        msg.content = req.caption || '';
        msg.mediaUrl = req.mediaUrl;
        msg.mediaMimeType = req.mediaMimeType;
        msg.mediaFilename = req.mediaFilename;
        break;
      case 'interactive':
      case 'flow':
        msg.content = req.bodyText || '';
        msg.interactiveData = this.buildInteractiveData(req);
        break;
      case 'template':
        if (req.template) {
          let content = req.template.bodyContent;
          for (const [key, value] of Object.entries(req.bodyParams || {})) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
          }
          msg.content = content || `[Template: ${req.template.displayName}]`;
          msg.templateName = req.template.name;
          msg.metadata = {
            template_name: req.template.name,
            template_id: req.template.id,
          };
          if (req.mediaUrl) {
            msg.mediaUrl = req.mediaUrl;
            msg.mediaMimeType = req.mediaMimeType;
          }
        }
        break;
    }

    if (req.replyToMessage) {
      msg.isReply = true;
      msg.replyToMessageId = req.replyToMessage.id;
    }

    return msg;
  }

  private async finalizeMessageSend(
    msgId: string,
    req: OutgoingMessageRequest,
    opts: MessageSendOptions,
    wamid: string | null,
    error: Error | null,
  ): Promise<void> {
    if (error) {
      await prisma.message.update({
        where: { id: msgId },
        data: { status: 'failed', errorMessage: error.message },
      });

      this.broadcastFn?.(req.account.organizationId, 'status_update', {
        message_id: msgId,
        contact_id: req.contact.id,
        status: 'failed',
        error_message: error.message,
      });
      return;
    }

    await prisma.message.update({
      where: { id: msgId },
      data: { status: 'sent', whatsappMessageId: wamid },
    });

    if (opts.dispatchWebhook) {
      dispatchWebhook(req.account.organizationId, 'message.sent', {
        messageId: msgId,
        contactId: req.contact.id,
        contactPhone: req.contact.phoneNumber,
        contactName: req.contact.profileName,
        messageType: req.type,
        content: req.content || req.bodyText || '',
        whatsappAccount: req.account.name,
        direction: 'outgoing',
        sentByUserId: opts.sentByUserId,
      } as MessageEventData);
    }

    this.broadcastFn?.(req.account.organizationId, 'status_update', {
      message_id: msgId,
      contact_id: req.contact.id,
      status: 'sent',
      wamid,
    });

    if (opts.markIncomingRead) {
      await this.markMessagesAsRead(req.account.organizationId, req.contact.id);
    }
  }

  private async markMessagesAsRead(orgId: string, contactId: string): Promise<void> {
    await prisma.message.updateMany({
      where: {
        organizationId: orgId,
        contactId,
        direction: 'incoming',
        status: { not: 'read' },
      },
      data: { status: 'read' },
    });
  }

  private async updateContactLastMessage(contact: any, preview: string): Promise<void> {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date(), lastMessagePreview: preview },
    });
  }

  async sendOutgoingMessage(
    req: OutgoingMessageRequest,
    opts: MessageSendOptions,
  ): Promise<any> {
    const msg = this.createOutgoingMessage(req, opts);
    await prisma.message.create({ data: msg });

    const sendFn = async (): Promise<string> => {
      const waAccount = this.toWhatsAppAccount(req.account);
      const recipient = new PhoneRecipient(req.contact.phoneNumber);
      const replyToMsgId = req.replyToMessage?.whatsappMessageId;

      switch (req.type) {
        case 'text':
          return await this.whatsappClient.sendTextMessage(
            waAccount, recipient, req.content || '', replyToMsgId,
          );

        case 'image':
        case 'video':
        case 'audio':
        case 'document': {
          let mediaId = req.mediaId;
          if (!mediaId && req.mediaData) {
            mediaId = await this.whatsappClient.uploadMedia(
              waAccount,
              req.mediaData,
              req.mediaMimeType || 'application/octet-stream',
              req.mediaFilename || 'file',
            );
          }
          if (req.type === 'image') {
            return await this.whatsappClient.sendImageMessage(waAccount, recipient, mediaId, req.caption);
          }
          if (req.type === 'video') {
            return await this.whatsappClient.sendVideoMessage(waAccount, recipient, mediaId, req.caption);
          }
          if (req.type === 'audio') {
            return await this.whatsappClient.sendAudioMessage(waAccount, recipient, mediaId);
          }
          return await this.whatsappClient.sendDocumentMessage(
            waAccount, recipient, mediaId, req.mediaFilename || 'document', req.caption,
          );
        }

        case 'interactive':
          if (req.interactiveType === 'cta_url') {
            return await this.whatsappClient.sendCTAURLButton(
              waAccount, recipient, req.bodyText || '', req.buttonText || '', req.url || '',
            );
          }
          if (req.interactiveType === 'voice_call') {
            return await this.whatsappClient.sendVoiceCallButton(
              waAccount, recipient, req.bodyText || '', req.displayText || '',
              req.ttlMinutes || 0, req.voiceCallPayload || '',
            );
          }
          return await this.whatsappClient.sendInteractiveButtons(
            waAccount, recipient, req.bodyText || '', req.buttons || [],
          );

        case 'template':
          if (!req.template) throw new Error('Template is required');
          const components = this.buildTemplateComponents(req);
          return await this.whatsappClient.sendTemplateMessage(
            waAccount, recipient, req.template.name, req.template.language, components,
          );

        default:
          throw new Error(`Unsupported message type: ${req.type}`);
      }
    };

    if (opts.async) {
      setImmediate(async () => {
        try {
          const wamid = await sendFn();
          await this.finalizeMessageSend(msg.id, req, opts, wamid, null);
        } catch (error) {
          await this.finalizeMessageSend(msg.id, req, opts, null, error as Error);
        }
      });
    } else {
      try {
        const wamid = await sendFn();
        await this.finalizeMessageSend(msg.id, req, opts, wamid, null);
      } catch (error) {
        await this.finalizeMessageSend(msg.id, req, opts, null, error as Error);
        throw error;
      }
    }

    this.broadcastFn?.(req.account.organizationId, 'new_message', {
      id: msg.id,
      contact_id: req.contact.id,
      assigned_user_id: req.contact.assignedUserId,
      profile_name: req.contact.profileName,
      direction: msg.direction,
      message_type: msg.messageType,
      content: { body: msg.content },
      media_url: msg.mediaUrl,
      media_mime_type: msg.mediaMimeType,
      media_filename: msg.mediaFilename,
      interactive_data: msg.interactiveData,
      status: msg.status,
      created_at: msg.createdAt,
      updated_at: msg.updatedAt,
      is_reply: msg.isReply,
      reply_to_message_id: msg.replyToMessageId,
    });

    await this.updateContactLastMessage(req.contact, this.getMessagePreview(req));

    return msg;
  }

  private buildTemplateComponents(req: OutgoingMessageRequest): any[] {
    const components: any[] = [];

    if (req.template.headerType && req.template.headerType !== 'NONE') {
      if (req.template.headerType === 'TEXT' && req.template.headerContent?.includes('{{')) {
        let headerValue = '';
        const headerNames = this.extractParamNames(req.template.headerContent);
        if (headerNames.length === 1) {
          headerValue = req.headerParams?.[headerNames[0]] || req.bodyParams?.[headerNames[0]] || '';
        }
        components.push({
          type: 'header',
          parameters: [{ type: 'text', text: headerValue }],
        });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(req.template.headerType) && req.headerMediaId) {
        const mediaType = req.template.headerType.toLowerCase();
        const mediaObj: any = { id: req.headerMediaId };
        if (mediaType === 'document' && req.headerMediaFilename) {
          mediaObj.filename = req.headerMediaFilename;
        }
        components.push({
          type: 'header',
          parameters: [{ type: mediaType, [mediaType]: mediaObj }],
        });
      }
    }

    const paramNames = this.extractParamNames(req.template.bodyContent);
    const bodyParams = paramNames.map(name => ({
      type: 'text',
      text: req.bodyParams?.[name] || '',
    }));
    components.push({ type: 'body', parameters: bodyParams });

    return components;
  }

  private extractParamNames(content: string): string[] {
    if (!content) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, m => m[1].trim());
  }
}

export const messageSender = new MessageSender();


