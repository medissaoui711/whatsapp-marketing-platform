import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import type { WhatsAppAccount, Recipient, MetaAPIResponse, MetaAPIError } from '../types/whatsapp';
import { PhoneRecipient } from '../types/whatsapp';

const DEFAULT_TIMEOUT = 30000;
const BASE_URL = 'https://graph.facebook.com';

export class WhatsAppClient {
  private httpClient: AxiosInstance;
  private baseURL: string;

  constructor(private logger?: Console) {
    this.httpClient = axios.create({ timeout: DEFAULT_TIMEOUT });
    this.baseURL = BASE_URL;
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  private getBaseURL(): string {
    return this.baseURL;
  }

  private async doRequest(
    method: string,
    url: string,
    body?: unknown,
    accessToken?: string
  ): Promise<unknown> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await this.httpClient.request({
        method,
        url,
        data: body,
        headers,
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const apiError = error.response.data as MetaAPIError;
        throw new Error(`Meta API Error: ${apiError.error.message} (code: ${apiError.error.code})`);
      }
      throw error;
    }
  }

  private buildMessagesURL(account: WhatsAppAccount): string {
    return `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/messages`;
  }

  private buildTemplatesURL(account: WhatsAppAccount): string {
    return `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/message_templates`;
  }

  private buildFlowsURL(account: WhatsAppAccount): string {
    return `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/flows`;
  }

  // ==================== Text Messages ====================

  async sendTextMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    text: string,
    replyToMsgId?: string
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    recipient.setOnPayload(payload);

    if (replyToMsgId) {
      payload.context = { message_id: replyToMsgId };
    }

    const url = this.buildMessagesURL(account);
    this.logger?.debug(`Sending text message to ${(recipient as PhoneRecipient).phone}`);

    const response = await this.doRequest('POST', url, payload, account.accessToken) as MetaAPIResponse;

    if (!response.messages?.length) {
      throw new Error('No message ID in response');
    }

    return response.messages[0].id;
  }

  // ==================== Media Messages ====================

  private async sendMediaMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    mediaType: string,
    mediaFields: Record<string, unknown>
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: mediaType,
      [mediaType]: mediaFields,
    };

    recipient.setOnPayload(payload);

    const url = this.buildMessagesURL(account);
    const response = await this.doRequest('POST', url, payload, account.accessToken) as MetaAPIResponse;

    if (!response.messages?.length) {
      throw new Error('No message ID in response');
    }

    return response.messages[0].id;
  }

  async sendImageMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    mediaId: string,
    caption?: string
  ): Promise<string> {
    return this.sendMediaMessage(account, recipient, 'image', { id: mediaId, caption });
  }

  async sendDocumentMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    mediaId: string,
    filename: string,
    caption?: string
  ): Promise<string> {
    return this.sendMediaMessage(account, recipient, 'document', { id: mediaId, filename, caption });
  }

  async sendVideoMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    mediaId: string,
    caption?: string
  ): Promise<string> {
    return this.sendMediaMessage(account, recipient, 'video', { id: mediaId, caption });
  }

  async sendAudioMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    mediaId: string
  ): Promise<string> {
    return this.sendMediaMessage(account, recipient, 'audio', { id: mediaId });
  }

  // ==================== Interactive Messages ====================

  async sendInteractiveButtons(
    account: WhatsAppAccount,
    recipient: Recipient,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<string> {
    if (buttons.length === 0) throw new Error('At least one button is required');
    if (buttons.length > 10) throw new Error('Maximum 10 buttons allowed');

    let interactive: Record<string, unknown>;

    if (buttons.length <= 3) {
      const buttonsList = buttons.map(btn => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.length > 20 ? btn.title.slice(0, 20) : btn.title,
        },
      }));

      interactive = {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: buttonsList },
      };
    } else {
      const rows = buttons.map(btn => ({
        id: btn.id,
        title: btn.title.length > 24 ? btn.title.slice(0, 24) : btn.title,
      }));

      interactive = {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: 'Select an option',
          sections: [{ title: 'Options', rows }],
        },
      };
    }

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'interactive',
      interactive,
    };

    recipient.setOnPayload(payload);

    const url = this.buildMessagesURL(account);
    const response = await this.doRequest('POST', url, payload, account.accessToken) as MetaAPIResponse;

    if (!response.messages?.length) {
      throw new Error('No message ID in response');
    }

    return response.messages[0].id;
  }

  async sendCTAURLButton(
    account: WhatsAppAccount,
    recipient: Recipient,
    bodyText: string,
    buttonText: string,
    url: string
  ): Promise<string> {
    if (!buttonText || !url) throw new Error('Button text and URL are required');

    const displayText = buttonText.length > 20 ? buttonText.slice(0, 20) : buttonText;

    const interactive = {
      type: 'cta_url',
      body: { text: bodyText },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: displayText,
          url,
        },
      },
    };

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'interactive',
      interactive,
    };

    recipient.setOnPayload(payload);

    const apiURL = this.buildMessagesURL(account);
    const response = await this.doRequest('POST', apiURL, payload, account.accessToken) as MetaAPIResponse;

    if (!response.messages?.length) {
      throw new Error('No message ID in response');
    }

    return response.messages[0].id;
  }

  // ==================== Voice Call Button ====================

  async sendVoiceCallButton(
    account: WhatsAppAccount,
    recipient: Recipient,
    bodyText: string,
    buttonText: string,
    phone: string
  ): Promise<string> {
    const interactive = {
      type: 'voice_call',
      body: { text: bodyText },
      action: {
        name: 'voice_call',
        parameters: {
          phone,
          display_text: buttonText.length > 20 ? buttonText.slice(0, 20) : buttonText,
        },
      },
    };

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'interactive',
      interactive,
    };

    recipient.setOnPayload(payload);

    const url = this.buildMessagesURL(account);
    const response = await this.doRequest('POST', url, payload, account.accessToken) as MetaAPIResponse;

    if (!response.messages?.length) {
      throw new Error('No message ID in response');
    }

    return response.messages[0].id;
  }

  // ==================== Template Management ====================

  async submitTemplate(
    account: WhatsAppAccount,
    input: {
      name: string;
      language: string;
      category: string;
      components: Array<Record<string, unknown>>;
      allowCategoryChange?: boolean;
    }
  ): Promise<{ id: string; status: string; category: string }> {
    const url = this.buildTemplatesURL(account);

    const body: Record<string, unknown> = {
      name: input.name,
      language: input.language,
      category: input.category,
      components: input.components,
    };

    if (input.allowCategoryChange !== undefined) {
      body.allow_category_change = input.allowCategoryChange;
    }

    const response = await this.doRequest('POST', url, body, account.accessToken) as {
      id: string;
      status: string;
      category: string;
    };

    return response;
  }

  async fetchTemplates(
    account: WhatsAppAccount
  ): Promise<Array<{ id: string; name: string; status: string; category: string }>> {
    const url = `${this.buildTemplatesURL(account)}?fields=id,name,status,category`;
    const response = await this.doRequest('GET', url, null, account.accessToken) as {
      data?: Array<{ id: string; name: string; status: string; category: string }>;
    };

    return response.data || [];
  }

  async deleteTemplate(account: WhatsAppAccount, templateName: string): Promise<void> {
    const url = `${this.buildTemplatesURL(account)}?name=${templateName}`;
    await this.doRequest('DELETE', url, null, account.accessToken);
  }

  // ==================== Template Messages ====================

  async sendTemplateMessage(
    account: WhatsAppAccount,
    recipient: Recipient,
    templateName: string,
    languageCode: string,
    components?: Array<Record<string, unknown>>
  ): Promise<string> {
    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
    };

    if (components?.length) {
      template.components = components;
    }

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      type: 'template',
      template,
    };

    recipient.setOnPayload(payload);

    const url = this.buildMessagesURL(account);
    const response = await this.doRequest('POST', url, payload, account.accessToken) as MetaAPIResponse;

    if (!response.messages?.length) {
      throw new Error('No message ID in response');
    }

    return response.messages[0].id;
  }

  // ==================== Media Operations ====================

  async getMediaURL(account: WhatsAppAccount, mediaId: string): Promise<string> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${mediaId}`;
    const response = await this.doRequest('GET', url, null, account.accessToken) as { url?: string };

    if (!response.url) {
      throw new Error('No URL in media response');
    }

    return response.url;
  }

  async downloadMedia(mediaURL: string, accessToken: string): Promise<Buffer> {
    const response = await this.httpClient.get(mediaURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  async uploadMedia(
    account: WhatsAppAccount,
    data: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/media`;

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', data, { filename, contentType: mimeType });

    const response = await this.httpClient.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${account.accessToken}`,
      },
    });

    if (!response.data.id) {
      throw new Error('No media ID in upload response');
    }

    return response.data.id;
  }

  // ==================== Read Receipts ====================

  async markMessageRead(account: WhatsAppAccount, messageId: string): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    const url = this.buildMessagesURL(account);
    await this.doRequest('POST', url, payload, account.accessToken);
  }

  // ==================== Credentials Validation ====================

  async validateCredentials(
    account: WhatsAppAccount
  ): Promise<{
    phoneNumber: string;
    verifiedName: string;
    accountMode: string;
    isTestNumber: boolean;
    qualityRating: string;
    codeVerificationStatus: string;
    warning?: string;
  }> {
    const phoneURL = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}?fields=display_phone_number,verified_name,code_verification_status,account_mode,quality_rating`;
    const phoneResult = await this.doRequest('GET', phoneURL, null, account.accessToken) as {
      display_phone_number: string;
      verified_name: string;
      account_mode: string;
      code_verification_status: string;
      quality_rating: string;
    };

    const isTestNumber = phoneResult.account_mode === 'SANDBOX' || phoneResult.verified_name === 'Test Number';
    let warning: string | undefined;

    if (!isTestNumber) {
      if (phoneResult.code_verification_status === 'NOT_VERIFIED') {
        throw new Error('Phone number is not verified. Please register it at: https://business.facebook.com/wa/manage/phone-numbers/');
      }
      if (phoneResult.code_verification_status === 'EXPIRED') {
        warning = 'Phone verification has expired. Consider re-verifying.';
      }
    }

    const businessURL = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}?fields=id,name`;
    await this.doRequest('GET', businessURL, null, account.accessToken);

    const phonesURL = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/phone_numbers`;
    const phonesResult = await this.doRequest('GET', phonesURL, null, account.accessToken) as { data: Array<{ id: string }> };

    const phoneFound = phonesResult.data.some(p => p.id === account.phoneId);
    if (!phoneFound) {
      throw new Error(`Phone ID '${account.phoneId}' does not belong to business ID '${account.businessId}'`);
    }

    return {
      phoneNumber: phoneResult.display_phone_number,
      verifiedName: phoneResult.verified_name,
      accountMode: phoneResult.account_mode,
      isTestNumber,
      qualityRating: phoneResult.quality_rating,
      codeVerificationStatus: phoneResult.code_verification_status,
      warning,
    };
  }

  // ==================== Business Profile ====================

  async getBusinessProfile(account: WhatsAppAccount): Promise<unknown> {
    const fields = 'about,address,description,email,profile_picture_url,websites,vertical,messaging_product';
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/whatsapp_business_profile?fields=${fields}`;
    const response = await this.doRequest('GET', url, null, account.accessToken) as { data?: unknown[] };

    if (!response.data?.length) {
      throw new Error('No business profile found');
    }

    return response.data[0];
  }

  async updateBusinessProfile(account: WhatsAppAccount, input: Record<string, unknown>): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/whatsapp_business_profile`;
    input.messaging_product = 'whatsapp';
    await this.doRequest('POST', url, input, account.accessToken);
  }

  async uploadProfilePicture(
    account: WhatsAppAccount,
    fileData: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<string> {
    if (!account.appId) {
      throw new Error('appId is required for profile picture upload');
    }

    const sessionURL = `${this.getBaseURL()}/${account.apiVersion}/${account.appId}/uploads`;
    const sessionPayload = { file_length: fileData.length, file_type: mimeType, file_name: filename };

    const sessionResp = await this.doRequest('POST', sessionURL, sessionPayload, account.accessToken) as { id?: string };
    if (!sessionResp.id) throw new Error('No session ID in upload response');

    const uploadURL = `${this.getBaseURL()}/${account.apiVersion}/${sessionResp.id}`;
    const response = await this.httpClient.request({
      method: 'POST',
      url: uploadURL,
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': mimeType,
        'file_offset': '0',
      },
      data: fileData,
      maxBodyLength: Infinity,
    });

    const finishResp = response.data as { h?: string };
    if (!finishResp.h) throw new Error('No handle in upload response');

    return finishResp.h;
  }

  // ==================== Webhook Subscription ====================

  async subscribeApp(account: WhatsAppAccount): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/subscribed_apps`;
    const response = await this.doRequest('POST', url, null, account.accessToken) as { success?: boolean };

    if (!response.success) {
      throw new Error('Subscription was not successful');
    }
  }

  // ==================== Flows ====================

  async createFlow(account: WhatsAppAccount, name: string, categories: string[]): Promise<string> {
    const url = this.buildFlowsURL(account);
    const response = await this.doRequest('POST', url, { name, categories }, account.accessToken) as { id: string };
    return response.id;
  }

  async getFlow(account: WhatsAppAccount, flowId: string): Promise<unknown> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}?fields=id,name,status,categories,preview.invalidate(false)`;
    return await this.doRequest('GET', url, null, account.accessToken);
  }

  async listFlows(account: WhatsAppAccount): Promise<unknown[]> {
    const url = `${this.buildFlowsURL(account)}?fields=id,name,status,categories,preview.invalidate(false)`;
    const response = await this.doRequest('GET', url, null, account.accessToken) as { data?: unknown[] };
    return response.data || [];
  }

  async updateFlowJSON(account: WhatsAppAccount, flowId: string, flowJSON: unknown): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}/assets`;

    const formData = new FormData();
    formData.append('file', Buffer.from(JSON.stringify(flowJSON)), {
      filename: 'flow.json',
      contentType: 'application/json',
    });
    formData.append('name', 'flow.json');
    formData.append('asset_type', 'FLOW_JSON');

    const response = await this.httpClient.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${account.accessToken}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.validation_errors || 'Failed to update flow JSON');
    }
  }

  async publishFlow(account: WhatsAppAccount, flowId: string): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}/publish`;
    const response = await this.doRequest('POST', url, null, account.accessToken) as { success?: boolean };

    if (!response.success) {
      throw new Error('Failed to publish flow');
    }
  }

  async deprecateFlow(account: WhatsAppAccount, flowId: string): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}/deprecate`;
    const response = await this.doRequest('POST', url, null, account.accessToken) as { success?: boolean };

    if (!response.success) {
      throw new Error('Failed to deprecate flow');
    }
  }

  async deleteFlow(account: WhatsAppAccount, flowId: string): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}`;
    await this.doRequest('DELETE', url, null, account.accessToken);
  }

  // ==================== Catalogs ====================

  async createCatalog(account: WhatsAppAccount, name: string): Promise<string> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/owned_product_catalogs`;
    const response = await this.doRequest('POST', url, { name }, account.accessToken) as { id: string };
    return response.id;
  }

  async listCatalogs(account: WhatsAppAccount): Promise<Array<{ id: string; name: string }>> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/owned_product_catalogs`;
    const response = await this.doRequest('GET', url, null, account.accessToken) as { data?: Array<{ id: string; name: string }> };
    return response.data || [];
  }

  async deleteCatalog(account: WhatsAppAccount, catalogId: string): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${catalogId}`;
    await this.doRequest('DELETE', url, null, account.accessToken);
  }

  async listCatalogProducts(account: WhatsAppAccount, catalogId: string): Promise<unknown[]> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${catalogId}/products?fields=id,name,price,currency,url,image_url,retailer_id,description`;
    const response = await this.doRequest('GET', url, null, account.accessToken) as { data?: unknown[] };
    return response.data || [];
  }

  async createProduct(
    account: WhatsAppAccount,
    catalogId: string,
    product: {
      name: string;
      price: number;
      currency: string;
      url: string;
      imageUrl: string;
      retailerId: string;
      description?: string;
    }
  ): Promise<string> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${catalogId}/products`;
    const response = await this.doRequest('POST', url, {
      name: product.name,
      price: String(product.price),
      currency: product.currency,
      url: product.url,
      image_url: product.imageUrl,
      retailer_id: product.retailerId,
      description: product.description,
    }, account.accessToken) as { id: string };
    return response.id;
  }

  async updateProduct(
    account: WhatsAppAccount,
    productId: string,
    product: Partial<{
      name: string;
      price: number;
      currency: string;
      url: string;
      imageUrl: string;
      description: string;
    }>
  ): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${productId}`;
    const body: Record<string, string> = {};

    if (product.name) body.name = product.name;
    if (product.price) body.price = String(product.price);
    if (product.currency) body.currency = product.currency;
    if (product.url) body.url = product.url;
    if (product.imageUrl) body.image_url = product.imageUrl;
    if (product.description) body.description = product.description;

    await this.doRequest('POST', url, body, account.accessToken);
  }

  async deleteProduct(account: WhatsAppAccount, productId: string): Promise<void> {
    const url = `${this.getBaseURL()}/${account.apiVersion}/${productId}`;
    await this.doRequest('DELETE', url, null, account.accessToken);
  }

  // ==================== Analytics ====================

  async getAnalytics(
    account: WhatsAppAccount,
    analyticsType: 'analytics' | 'pricing_analytics' | 'template_analytics' | 'call_analytics',
    request: {
      start: number;
      end: number;
      granularity: string;
      phoneNumbers?: string[];
      templateIds?: string[];
      countryCodes?: string[];
    }
  ): Promise<{ granularity: string; dataPoints: unknown[] }> {
    if (analyticsType === 'template_analytics') {
      return this.getTemplateAnalytics(account, request);
    }

    const filters: string[] = [
      `start(${request.start})`,
      `end(${request.end})`,
    ];

    const normalizedGranularity = this.normalizeGranularity(request.granularity, analyticsType);
    filters.push(`granularity(${normalizedGranularity})`);

    if (request.phoneNumbers?.length) {
      filters.push(`phone_numbers(${JSON.stringify(request.phoneNumbers)})`);
    }

    if (request.countryCodes?.length && analyticsType === 'pricing_analytics') {
      filters.push(`country_codes(${JSON.stringify(request.countryCodes)})`);
    }

    if (analyticsType === 'pricing_analytics') {
      filters.push('dimensions(PRICING_CATEGORY,PRICING_TYPE,COUNTRY)');
    }

    if (analyticsType === 'call_analytics') {
      filters.push('dimensions(direction)');
      filters.push('metric_types(COUNT,COST,AVERAGE_DURATION)');
    }

    const field = `${analyticsType}.${filters.join('.')}`;
    const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}?fields=${field}`;

    const response = (await this.doRequest('GET', url, null, account.accessToken)) as Record<string, unknown>;

    const analyticsData = response[analyticsType] as Record<string, unknown> | undefined;
    if (analyticsData?.data_points) {
      return { granularity: analyticsData.granularity as string, dataPoints: analyticsData.data_points as unknown[] };
    }
    if (analyticsData?.data) {
      const dataPoints = (analyticsData.data as Array<Record<string, unknown>>).flatMap(
        (entry: Record<string, unknown>) => (entry.data_points as unknown[]) || []
      );
      return { granularity: analyticsData.granularity as string, dataPoints };
    }

    return { granularity: normalizedGranularity, dataPoints: [] };
  }

  private async getTemplateAnalytics(
    account: WhatsAppAccount,
    request: { start: number; end: number; templateIds?: string[] }
  ): Promise<{ granularity: string; dataPoints: unknown[] }> {
    let url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/template_analytics?start=${request.start}&end=${request.end}&granularity=daily&metric_types=cost,clicked,delivered,read,sent`;

    if (request.templateIds?.length) {
      url += `&template_ids=[${request.templateIds.join(',')}]`;
    }

    let allDataPoints: unknown[] = [];
    let nextURL: string | undefined = url;
    let pageCount = 0;
    const maxPages = 50;

    while (nextURL && pageCount < maxPages) {
      const response = await this.doRequest('GET', nextURL, null, account.accessToken) as {
        data?: Array<Record<string, unknown>>;
        paging?: { next?: string };
      };

      for (const entry of response.data || []) {
        allDataPoints.push(...((entry.data_points as unknown[]) || []));
      }

      nextURL = response.paging?.next;
      pageCount++;
    }

    return {
      granularity: 'DAILY',
      dataPoints: allDataPoints,
    };
  }

  private normalizeGranularity(granularity: string, analyticsType: string): string {
    const normalized = granularity === 'DAILY' ? 'DAY' : granularity === 'MONTHLY' ? 'MONTH' : granularity;

    if (analyticsType === 'template_analytics') {
      return 'DAILY';
    }

    if (analyticsType === 'pricing_analytics' || analyticsType === 'call_analytics') {
      if (normalized === 'DAY') return 'DAILY';
      if (normalized === 'MONTH') return 'MONTHLY';
    }

    return normalized;
  }
}


