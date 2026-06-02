import { prisma } from '@repo/db';

export const contactutil = {
  async getOrCreateContact(
    organizationId: string,
    phoneNumber: string,
    profileName: string,
  ) {
    const existing = await prisma.contact.findFirst({
      where: {
        organizationId,
        phoneNumber,
      },
    });

    if (existing) {
      if (profileName && existing.profileName !== profileName) {
        return prisma.contact.update({
          where: { id: existing.id },
          data: { profileName },
        });
      }
      return existing;
    }

    return prisma.contact.create({
      data: {
        organizationId,
        phoneNumber,
        profileName: profileName || undefined,
      },
    });
  },
};


