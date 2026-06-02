export interface WhatsAppAccount {
    phoneId: string;
    businessId: string;
    appId?: string;
    apiVersion: string;
    accessToken: string;
}
export interface Recipient {
    phone: string;
    setOnPayload(payload: Record<string, unknown>): void;
}
export declare class PhoneRecipient implements Recipient {
    phone: string;
    constructor(phone: string);
    setOnPayload(payload: Record<string, unknown>): void;
}
export interface Button {
    id: string;
    title: string;
}
export interface TemplateParam {
    type: 'text' | 'image' | 'document' | 'video';
    text?: string;
    image?: {
        link: string;
    };
    document?: {
        link: string;
        filename: string;
    };
    video?: {
        link: string;
    };
}
export interface MetaAPIResponse {
    messages?: Array<{
        id: string;
    }>;
    contacts?: Array<{
        input: string;
        wa_id: string;
    }>;
}
export interface MetaAPIError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        error_user_msg?: string;
        error_data?: {
            details: string;
        };
        fbtrace_id?: string;
    };
}
export interface FlowJSON {
    version: string;
    dataApiVersion?: string;
    routingModel?: Record<string, unknown>;
    screens: unknown[];
}
export interface CatalogInfo {
    id: string;
    name: string;
}
export interface ProductInfo {
    id: string;
    name: string;
    price?: string;
    currency?: string;
    url?: string;
    image_url?: string;
    retailer_id?: string;
    description?: string;
}
export interface BusinessProfile {
    messagingProduct?: string;
    address?: string;
    description?: string;
    vertical?: string;
    email?: string;
    websites?: string[];
    profilePictureUrl?: string;
    about?: string;
}
export interface ProductInput {
    name: string;
    price: number;
    currency: string;
    url: string;
    imageUrl: string;
    retailerId: string;
    description?: string;
}


