export declare function normalizeContactPhone(phone: string): string;
export declare function formatPhoneWithCountryCode(phone: string, defaultCountryCode?: string): string;
export declare function getOrCreateContact(organizationId: string, phoneNumber: string, profileName?: string): Promise<{
    contact: Record<string, unknown>;
    isNew: boolean;
}>;
export declare function updateContactLastMessage(contactId: string, preview: string): Promise<void>;
export declare function updateContactLastInbound(contactId: string): Promise<void>;
export declare function isServiceWindowOpen(lastInboundAt: Date | null): boolean;
//# sourceMappingURL=contact.d.ts.map