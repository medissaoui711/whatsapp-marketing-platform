import type { WhatsAppAccount, Recipient } from '../types/whatsapp';
export declare class WhatsAppClient {
    private logger?;
    private httpClient;
    private baseURL;
    constructor(logger?: Console | undefined);
    setBaseURL(url: string): void;
    private getBaseURL;
    private doRequest;
    private buildMessagesURL;
    private buildTemplatesURL;
    private buildFlowsURL;
    sendTextMessage(account: WhatsAppAccount, recipient: Recipient, text: string, replyToMsgId?: string): Promise<string>;
    private sendMediaMessage;
    sendImageMessage(account: WhatsAppAccount, recipient: Recipient, mediaId: string, caption?: string): Promise<string>;
    sendDocumentMessage(account: WhatsAppAccount, recipient: Recipient, mediaId: string, filename: string, caption?: string): Promise<string>;
    sendVideoMessage(account: WhatsAppAccount, recipient: Recipient, mediaId: string, caption?: string): Promise<string>;
    sendAudioMessage(account: WhatsAppAccount, recipient: Recipient, mediaId: string): Promise<string>;
    sendInteractiveButtons(account: WhatsAppAccount, recipient: Recipient, bodyText: string, buttons: Array<{
        id: string;
        title: string;
    }>): Promise<string>;
    sendCTAURLButton(account: WhatsAppAccount, recipient: Recipient, bodyText: string, buttonText: string, url: string): Promise<string>;
    sendVoiceCallButton(account: WhatsAppAccount, recipient: Recipient, bodyText: string, buttonText: string, phone: string): Promise<string>;
    submitTemplate(account: WhatsAppAccount, input: {
        name: string;
        language: string;
        category: string;
        components: Array<Record<string, unknown>>;
        allowCategoryChange?: boolean;
    }): Promise<{
        id: string;
        status: string;
        category: string;
    }>;
    fetchTemplates(account: WhatsAppAccount): Promise<Array<{
        id: string;
        name: string;
        status: string;
        category: string;
    }>>;
    deleteTemplate(account: WhatsAppAccount, templateName: string): Promise<void>;
    sendTemplateMessage(account: WhatsAppAccount, recipient: Recipient, templateName: string, languageCode: string, components?: Array<Record<string, unknown>>): Promise<string>;
    getMediaURL(account: WhatsAppAccount, mediaId: string): Promise<string>;
    downloadMedia(mediaURL: string, accessToken: string): Promise<Buffer>;
    uploadMedia(account: WhatsAppAccount, data: Buffer, mimeType: string, filename: string): Promise<string>;
    markMessageRead(account: WhatsAppAccount, messageId: string): Promise<void>;
    validateCredentials(account: WhatsAppAccount): Promise<{
        phoneNumber: string;
        verifiedName: string;
        accountMode: string;
        isTestNumber: boolean;
        qualityRating: string;
        codeVerificationStatus: string;
        warning?: string;
    }>;
    getBusinessProfile(account: WhatsAppAccount): Promise<unknown>;
    updateBusinessProfile(account: WhatsAppAccount, input: Record<string, unknown>): Promise<void>;
    uploadProfilePicture(account: WhatsAppAccount, fileData: Buffer, mimeType: string, filename: string): Promise<string>;
    subscribeApp(account: WhatsAppAccount): Promise<void>;
    createFlow(account: WhatsAppAccount, name: string, categories: string[]): Promise<string>;
    getFlow(account: WhatsAppAccount, flowId: string): Promise<unknown>;
    listFlows(account: WhatsAppAccount): Promise<unknown[]>;
    updateFlowJSON(account: WhatsAppAccount, flowId: string, flowJSON: unknown): Promise<void>;
    publishFlow(account: WhatsAppAccount, flowId: string): Promise<void>;
    deprecateFlow(account: WhatsAppAccount, flowId: string): Promise<void>;
    deleteFlow(account: WhatsAppAccount, flowId: string): Promise<void>;
    createCatalog(account: WhatsAppAccount, name: string): Promise<string>;
    listCatalogs(account: WhatsAppAccount): Promise<Array<{
        id: string;
        name: string;
    }>>;
    deleteCatalog(account: WhatsAppAccount, catalogId: string): Promise<void>;
    listCatalogProducts(account: WhatsAppAccount, catalogId: string): Promise<unknown[]>;
    createProduct(account: WhatsAppAccount, catalogId: string, product: {
        name: string;
        price: number;
        currency: string;
        url: string;
        imageUrl: string;
        retailerId: string;
        description?: string;
    }): Promise<string>;
    updateProduct(account: WhatsAppAccount, productId: string, product: Partial<{
        name: string;
        price: number;
        currency: string;
        url: string;
        imageUrl: string;
        description: string;
    }>): Promise<void>;
    deleteProduct(account: WhatsAppAccount, productId: string): Promise<void>;
    getAnalytics(account: WhatsAppAccount, analyticsType: 'analytics' | 'pricing_analytics' | 'template_analytics' | 'call_analytics', request: {
        start: number;
        end: number;
        granularity: string;
        phoneNumbers?: string[];
        templateIds?: string[];
        countryCodes?: string[];
    }): Promise<{
        granularity: string;
        dataPoints: unknown[];
    }>;
    private getTemplateAnalytics;
    private normalizeGranularity;
}


