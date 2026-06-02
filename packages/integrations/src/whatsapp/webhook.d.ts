export declare class WebhookParser {
    static verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): string | null;
    static extractMessages(body: Record<string, unknown>): unknown[];
    static extractStatuses(body: Record<string, unknown>): unknown[];
    static hasMessages(body: Record<string, unknown>): boolean;
    static hasStatuses(body: Record<string, unknown>): boolean;
}


