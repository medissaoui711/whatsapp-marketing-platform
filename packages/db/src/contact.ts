import { getPrisma } from './connection';

export function normalizeContactPhone(phone: string): string {
  if (!phone) return '';
  if (phone.startsWith('+')) {
    return phone.substring(1);
  }
  return phone;
}

export function formatPhoneWithCountryCode(phone: string, defaultCountryCode: string = '966'): string {
  const normalized = normalizeContactPhone(phone);
  if (normalized.startsWith(defaultCountryCode)) {
    return `+${normalized}`;
  }
  return `+${defaultCountryCode}${normalized}`;
}

export async function getOrCreateContact(
  organizationId: string,
  phoneNumber: string,
  profileName: string = ''
): Promise<{ contact: Record<string, unknown>; isNew: boolean }> {
  const prisma = getPrisma();
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

    return { contact: contact as unknown as Record<string, unknown>, isNew: false };
  }

  try {
    contact = await prisma.contact.create({
      data: {
        organizationId,
        phoneNumber: normalizedPhone,
        profileName,
      },
    });
    return { contact: contact as unknown as Record<string, unknown>, isNew: true };
  } catch {
    const existingContact = await prisma.contact.findFirst({
      where: { organizationId, phoneNumber: normalizedPhone },
    });

    if (existingContact) {
      return { contact: existingContact as unknown as Record<string, unknown>, isNew: false };
    }
    throw new Error('Failed to create contact');
  }
}

export async function updateContactLastMessage(contactId: string, preview: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
    },
  });
}

export async function updateContactLastInbound(contactId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastInboundAt: new Date() },
  });
}

export function isServiceWindowOpen(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastInboundAt > twentyFourHoursAgo;
}


