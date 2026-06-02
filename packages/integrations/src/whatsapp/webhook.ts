export class WebhookParser {
  static verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  static extractMessages(body: Record<string, unknown>): unknown[] {
    if (!body?.entry) return [];
    const entries = body.entry as Array<Record<string, unknown>>;
    const messages: unknown[] = [];

    for (const entry of entries) {
      const changes = entry.changes as Array<Record<string, unknown>> || [];
      for (const change of changes) {
        const value = change.value as Record<string, unknown> || {};
        const msgs = value.messages as unknown[] || [];
        messages.push(...msgs);
      }
    }

    return messages;
  }

  static extractStatuses(body: Record<string, unknown>): unknown[] {
    if (!body?.entry) return [];
    const entries = body.entry as Array<Record<string, unknown>>;
    const statuses: unknown[] = [];

    for (const entry of entries) {
      const changes = entry.changes as Array<Record<string, unknown>> || [];
      for (const change of changes) {
        const value = change.value as Record<string, unknown> || {};
        const stats = value.statuses as unknown[] || [];
        statuses.push(...stats);
      }
    }

    return statuses;
  }

  static hasMessages(body: Record<string, unknown>): boolean {
    return this.extractMessages(body).length > 0;
  }

  static hasStatuses(body: Record<string, unknown>): boolean {
    return this.extractStatuses(body).length > 0;
  }
}


