"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppClient = void 0;
const axios_1 = __importStar(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const DEFAULT_TIMEOUT = 30000;
const BASE_URL = 'https://graph.facebook.com';
class WhatsAppClient {
    constructor(logger) {
        this.logger = logger;
        this.httpClient = axios_1.default.create({ timeout: DEFAULT_TIMEOUT });
        this.baseURL = BASE_URL;
    }
    setBaseURL(url) {
        this.baseURL = url;
    }
    getBaseURL() {
        return this.baseURL;
    }
    async doRequest(method, url, body, accessToken) {
        try {
            const headers = {
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
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError && error.response?.data) {
                const apiError = error.response.data;
                throw new Error(`Meta API Error: ${apiError.error.message} (code: ${apiError.error.code})`);
            }
            throw error;
        }
    }
    buildMessagesURL(account) {
        return `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/messages`;
    }
    buildTemplatesURL(account) {
        return `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/message_templates`;
    }
    buildFlowsURL(account) {
        return `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/flows`;
    }
    // ==================== Text Messages ====================
    async sendTextMessage(account, recipient, text, replyToMsgId) {
        const payload = {
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
        this.logger?.debug(`Sending text message to ${recipient.phone}`);
        const response = await this.doRequest('POST', url, payload, account.accessToken);
        if (!response.messages?.length) {
            throw new Error('No message ID in response');
        }
        return response.messages[0].id;
    }
    // ==================== Media Messages ====================
    async sendMediaMessage(account, recipient, mediaType, mediaFields) {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            type: mediaType,
            [mediaType]: mediaFields,
        };
        recipient.setOnPayload(payload);
        const url = this.buildMessagesURL(account);
        const response = await this.doRequest('POST', url, payload, account.accessToken);
        if (!response.messages?.length) {
            throw new Error('No message ID in response');
        }
        return response.messages[0].id;
    }
    async sendImageMessage(account, recipient, mediaId, caption) {
        return this.sendMediaMessage(account, recipient, 'image', { id: mediaId, caption });
    }
    async sendDocumentMessage(account, recipient, mediaId, filename, caption) {
        return this.sendMediaMessage(account, recipient, 'document', { id: mediaId, filename, caption });
    }
    async sendVideoMessage(account, recipient, mediaId, caption) {
        return this.sendMediaMessage(account, recipient, 'video', { id: mediaId, caption });
    }
    async sendAudioMessage(account, recipient, mediaId) {
        return this.sendMediaMessage(account, recipient, 'audio', { id: mediaId });
    }
    // ==================== Interactive Messages ====================
    async sendInteractiveButtons(account, recipient, bodyText, buttons) {
        if (buttons.length === 0)
            throw new Error('At least one button is required');
        if (buttons.length > 10)
            throw new Error('Maximum 10 buttons allowed');
        let interactive;
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
        }
        else {
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
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            type: 'interactive',
            interactive,
        };
        recipient.setOnPayload(payload);
        const url = this.buildMessagesURL(account);
        const response = await this.doRequest('POST', url, payload, account.accessToken);
        if (!response.messages?.length) {
            throw new Error('No message ID in response');
        }
        return response.messages[0].id;
    }
    async sendCTAURLButton(account, recipient, bodyText, buttonText, url) {
        if (!buttonText || !url)
            throw new Error('Button text and URL are required');
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
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            type: 'interactive',
            interactive,
        };
        recipient.setOnPayload(payload);
        const apiURL = this.buildMessagesURL(account);
        const response = await this.doRequest('POST', apiURL, payload, account.accessToken);
        if (!response.messages?.length) {
            throw new Error('No message ID in response');
        }
        return response.messages[0].id;
    }
    // ==================== Voice Call Button ====================
    async sendVoiceCallButton(account, recipient, bodyText, buttonText, phone) {
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
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            type: 'interactive',
            interactive,
        };
        recipient.setOnPayload(payload);
        const url = this.buildMessagesURL(account);
        const response = await this.doRequest('POST', url, payload, account.accessToken);
        if (!response.messages?.length) {
            throw new Error('No message ID in response');
        }
        return response.messages[0].id;
    }
    // ==================== Template Management ====================
    async submitTemplate(account, input) {
        const url = this.buildTemplatesURL(account);
        const body = {
            name: input.name,
            language: input.language,
            category: input.category,
            components: input.components,
        };
        if (input.allowCategoryChange !== undefined) {
            body.allow_category_change = input.allowCategoryChange;
        }
        const response = await this.doRequest('POST', url, body, account.accessToken);
        return response;
    }
    async fetchTemplates(account) {
        const url = `${this.buildTemplatesURL(account)}?fields=id,name,status,category`;
        const response = await this.doRequest('GET', url, null, account.accessToken);
        return response.data || [];
    }
    async deleteTemplate(account, templateName) {
        const url = `${this.buildTemplatesURL(account)}?name=${templateName}`;
        await this.doRequest('DELETE', url, null, account.accessToken);
    }
    // ==================== Template Messages ====================
    async sendTemplateMessage(account, recipient, templateName, languageCode, components) {
        const template = {
            name: templateName,
            language: { code: languageCode },
        };
        if (components?.length) {
            template.components = components;
        }
        const payload = {
            messaging_product: 'whatsapp',
            type: 'template',
            template,
        };
        recipient.setOnPayload(payload);
        const url = this.buildMessagesURL(account);
        const response = await this.doRequest('POST', url, payload, account.accessToken);
        if (!response.messages?.length) {
            throw new Error('No message ID in response');
        }
        return response.messages[0].id;
    }
    // ==================== Media Operations ====================
    async getMediaURL(account, mediaId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${mediaId}`;
        const response = await this.doRequest('GET', url, null, account.accessToken);
        if (!response.url) {
            throw new Error('No URL in media response');
        }
        return response.url;
    }
    async downloadMedia(mediaURL, accessToken) {
        const response = await this.httpClient.get(mediaURL, {
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer',
        });
        return Buffer.from(response.data);
    }
    async uploadMedia(account, data, mimeType, filename) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/media`;
        const formData = new form_data_1.default();
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
    async markMessageRead(account, messageId) {
        const payload = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
        };
        const url = this.buildMessagesURL(account);
        await this.doRequest('POST', url, payload, account.accessToken);
    }
    // ==================== Credentials Validation ====================
    async validateCredentials(account) {
        const phoneURL = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}?fields=display_phone_number,verified_name,code_verification_status,account_mode,quality_rating`;
        const phoneResult = await this.doRequest('GET', phoneURL, null, account.accessToken);
        const isTestNumber = phoneResult.account_mode === 'SANDBOX' || phoneResult.verified_name === 'Test Number';
        let warning;
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
        const phonesResult = await this.doRequest('GET', phonesURL, null, account.accessToken);
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
    async getBusinessProfile(account) {
        const fields = 'about,address,description,email,profile_picture_url,websites,vertical,messaging_product';
        const url = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/whatsapp_business_profile?fields=${fields}`;
        const response = await this.doRequest('GET', url, null, account.accessToken);
        if (!response.data?.length) {
            throw new Error('No business profile found');
        }
        return response.data[0];
    }
    async updateBusinessProfile(account, input) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${account.phoneId}/whatsapp_business_profile`;
        input.messaging_product = 'whatsapp';
        await this.doRequest('POST', url, input, account.accessToken);
    }
    async uploadProfilePicture(account, fileData, mimeType, filename) {
        if (!account.appId) {
            throw new Error('appId is required for profile picture upload');
        }
        const sessionURL = `${this.getBaseURL()}/${account.apiVersion}/${account.appId}/uploads`;
        const sessionPayload = { file_length: fileData.length, file_type: mimeType, file_name: filename };
        const sessionResp = await this.doRequest('POST', sessionURL, sessionPayload, account.accessToken);
        if (!sessionResp.id)
            throw new Error('No session ID in upload response');
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
        const finishResp = response.data;
        if (!finishResp.h)
            throw new Error('No handle in upload response');
        return finishResp.h;
    }
    // ==================== Webhook Subscription ====================
    async subscribeApp(account) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/subscribed_apps`;
        const response = await this.doRequest('POST', url, null, account.accessToken);
        if (!response.success) {
            throw new Error('Subscription was not successful');
        }
    }
    // ==================== Flows ====================
    async createFlow(account, name, categories) {
        const url = this.buildFlowsURL(account);
        const response = await this.doRequest('POST', url, { name, categories }, account.accessToken);
        return response.id;
    }
    async getFlow(account, flowId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}?fields=id,name,status,categories,preview.invalidate(false)`;
        return await this.doRequest('GET', url, null, account.accessToken);
    }
    async listFlows(account) {
        const url = `${this.buildFlowsURL(account)}?fields=id,name,status,categories,preview.invalidate(false)`;
        const response = await this.doRequest('GET', url, null, account.accessToken);
        return response.data || [];
    }
    async updateFlowJSON(account, flowId, flowJSON) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}/assets`;
        const formData = new form_data_1.default();
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
    async publishFlow(account, flowId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}/publish`;
        const response = await this.doRequest('POST', url, null, account.accessToken);
        if (!response.success) {
            throw new Error('Failed to publish flow');
        }
    }
    async deprecateFlow(account, flowId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}/deprecate`;
        const response = await this.doRequest('POST', url, null, account.accessToken);
        if (!response.success) {
            throw new Error('Failed to deprecate flow');
        }
    }
    async deleteFlow(account, flowId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${flowId}`;
        await this.doRequest('DELETE', url, null, account.accessToken);
    }
    // ==================== Catalogs ====================
    async createCatalog(account, name) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/owned_product_catalogs`;
        const response = await this.doRequest('POST', url, { name }, account.accessToken);
        return response.id;
    }
    async listCatalogs(account) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/owned_product_catalogs`;
        const response = await this.doRequest('GET', url, null, account.accessToken);
        return response.data || [];
    }
    async deleteCatalog(account, catalogId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${catalogId}`;
        await this.doRequest('DELETE', url, null, account.accessToken);
    }
    async listCatalogProducts(account, catalogId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${catalogId}/products?fields=id,name,price,currency,url,image_url,retailer_id,description`;
        const response = await this.doRequest('GET', url, null, account.accessToken);
        return response.data || [];
    }
    async createProduct(account, catalogId, product) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${catalogId}/products`;
        const response = await this.doRequest('POST', url, {
            name: product.name,
            price: String(product.price),
            currency: product.currency,
            url: product.url,
            image_url: product.imageUrl,
            retailer_id: product.retailerId,
            description: product.description,
        }, account.accessToken);
        return response.id;
    }
    async updateProduct(account, productId, product) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${productId}`;
        const body = {};
        if (product.name)
            body.name = product.name;
        if (product.price)
            body.price = String(product.price);
        if (product.currency)
            body.currency = product.currency;
        if (product.url)
            body.url = product.url;
        if (product.imageUrl)
            body.image_url = product.imageUrl;
        if (product.description)
            body.description = product.description;
        await this.doRequest('POST', url, body, account.accessToken);
    }
    async deleteProduct(account, productId) {
        const url = `${this.getBaseURL()}/${account.apiVersion}/${productId}`;
        await this.doRequest('DELETE', url, null, account.accessToken);
    }
    // ==================== Analytics ====================
    async getAnalytics(account, analyticsType, request) {
        if (analyticsType === 'template_analytics') {
            return this.getTemplateAnalytics(account, request);
        }
        const filters = [
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
        const response = (await this.doRequest('GET', url, null, account.accessToken));
        const analyticsData = response[analyticsType];
        if (analyticsData?.data_points) {
            return { granularity: analyticsData.granularity, dataPoints: analyticsData.data_points };
        }
        if (analyticsData?.data) {
            const dataPoints = analyticsData.data.flatMap((entry) => entry.data_points || []);
            return { granularity: analyticsData.granularity, dataPoints };
        }
        return { granularity: normalizedGranularity, dataPoints: [] };
    }
    async getTemplateAnalytics(account, request) {
        let url = `${this.getBaseURL()}/${account.apiVersion}/${account.businessId}/template_analytics?start=${request.start}&end=${request.end}&granularity=daily&metric_types=cost,clicked,delivered,read,sent`;
        if (request.templateIds?.length) {
            url += `&template_ids=[${request.templateIds.join(',')}]`;
        }
        let allDataPoints = [];
        let nextURL = url;
        let pageCount = 0;
        const maxPages = 50;
        while (nextURL && pageCount < maxPages) {
            const response = await this.doRequest('GET', nextURL, null, account.accessToken);
            for (const entry of response.data || []) {
                allDataPoints.push(...(entry.data_points || []));
            }
            nextURL = response.paging?.next;
            pageCount++;
        }
        return {
            granularity: 'DAILY',
            dataPoints: allDataPoints,
        };
    }
    normalizeGranularity(granularity, analyticsType) {
        const normalized = granularity === 'DAILY' ? 'DAY' : granularity === 'MONTHLY' ? 'MONTH' : granularity;
        if (analyticsType === 'template_analytics') {
            return 'DAILY';
        }
        if (analyticsType === 'pricing_analytics' || analyticsType === 'call_analytics') {
            if (normalized === 'DAY')
                return 'DAILY';
            if (normalized === 'MONTH')
                return 'MONTHLY';
        }
        return normalized;
    }
}
exports.WhatsAppClient = WhatsAppClient;
//# sourceMappingURL=client.js.map