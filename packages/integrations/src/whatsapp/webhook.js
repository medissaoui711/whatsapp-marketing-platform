"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookParser = void 0;
class WebhookParser {
    static verifyWebhook(mode, token, challenge, verifyToken) {
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        return null;
    }
    static extractMessages(body) {
        if (!body?.entry)
            return [];
        const entries = body.entry;
        const messages = [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                const value = change.value || {};
                const msgs = value.messages || [];
                messages.push(...msgs);
            }
        }
        return messages;
    }
    static extractStatuses(body) {
        if (!body?.entry)
            return [];
        const entries = body.entry;
        const statuses = [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                const value = change.value || {};
                const stats = value.statuses || [];
                statuses.push(...stats);
            }
        }
        return statuses;
    }
    static hasMessages(body) {
        return this.extractMessages(body).length > 0;
    }
    static hasStatuses(body) {
        return this.extractStatuses(body).length > 0;
    }
}
exports.WebhookParser = WebhookParser;
//# sourceMappingURL=webhook.js.map