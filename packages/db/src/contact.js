"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeContactPhone = normalizeContactPhone;
exports.formatPhoneWithCountryCode = formatPhoneWithCountryCode;
exports.getOrCreateContact = getOrCreateContact;
exports.updateContactLastMessage = updateContactLastMessage;
exports.updateContactLastInbound = updateContactLastInbound;
exports.isServiceWindowOpen = isServiceWindowOpen;
const connection_1 = require("./connection");
function normalizeContactPhone(phone) {
    if (!phone)
        return '';
    if (phone.startsWith('+')) {
        return phone.substring(1);
    }
    return phone;
}
function formatPhoneWithCountryCode(phone, defaultCountryCode = '966') {
    const normalized = normalizeContactPhone(phone);
    if (normalized.startsWith(defaultCountryCode)) {
        return `+${normalized}`;
    }
    return `+${defaultCountryCode}${normalized}`;
}
async function getOrCreateContact(organizationId, phoneNumber, profileName = '') {
    const prisma = (0, connection_1.getPrisma)();
    const normalizedPhone = normalizeContactPhone(phoneNumber);
    let contact = await prisma.contact.findFirst({
        where: { organizationId, phoneNumber: normalizedPhone },
    });
    if (!contact) {
        contact = await prisma.contact.findFirst({
            where: { organizationId, phoneNumber: `+${normalizedPhone}` },
        });
    }
    if (contact) {
        if (profileName && contact.profileName !== profileName) {
            contact = await prisma.contact.update({
                where: { id: contact.id },
                data: { profileName },
            });
        }
        return { contact: contact, isNew: false };
    }
    try {
        contact = await prisma.contact.create({
            data: {
                organizationId,
                phoneNumber: normalizedPhone,
                profileName,
            },
        });
        return { contact: contact, isNew: true };
    }
    catch {
        const existingContact = await prisma.contact.findFirst({
            where: { organizationId, phoneNumber: normalizedPhone },
        });
        if (existingContact) {
            return { contact: existingContact, isNew: false };
        }
        throw new Error('Failed to create contact');
    }
}
async function updateContactLastMessage(contactId, preview) {
    const prisma = (0, connection_1.getPrisma)();
    await prisma.contact.update({
        where: { id: contactId },
        data: {
            lastMessageAt: new Date(),
            lastMessagePreview: preview,
        },
    });
}
async function updateContactLastInbound(contactId) {
    const prisma = (0, connection_1.getPrisma)();
    await prisma.contact.update({
        where: { id: contactId },
        data: { lastInboundAt: new Date() },
    });
}
function isServiceWindowOpen(lastInboundAt) {
    if (!lastInboundAt)
        return false;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastInboundAt > twentyFourHoursAgo;
}
//# sourceMappingURL=contact.js.map