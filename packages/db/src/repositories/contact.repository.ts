import { BaseRepository, RepositoryOptions } from './base.repository';

export interface ContactFilter {
  search?: string;
  tags?: string[];
  assignedUserId?: string;
  isRead?: boolean;
}

export class ContactRepository extends BaseRepository<any> {
  constructor() {
    super('contact');
  }

  async findByPhoneNumber(phoneNumber: string, options: RepositoryOptions = {}) {
    return this.getModel().findFirst({
      where: this.addOrgFilter({ phoneNumber }, options),
    });
  }

  async findWithFilters(
    filters: ContactFilter,
    options: RepositoryOptions = {},
    pagination?: { page: number; limit: number },
  ) {
    const where: any = this.addOrgFilter({}, options);

    if (filters.search) {
      where.OR = [
        { profileName: { contains: filters.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filters.search } },
      ];
    }

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.assignedUserId) {
      where.assignedUserId = filters.assignedUserId;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const orderBy = { lastMessageAt: 'desc' as const };

    if (pagination) {
      return this.getModel().findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy,
      });
    }

    return this.getModel().findMany({ where, orderBy });
  }

  async getUnreadCount(assignedUserId: string, options: RepositoryOptions = {}) {
    return this.getModel().count({
      where: this.addOrgFilter({ assignedUserId, isRead: false }, options),
    });
  }

  async assignToAgent(contactId: string, agentId: string, options: RepositoryOptions = {}) {
    return this.getModel().update({
      where: this.addOrgFilter({ id: contactId }, options),
      data: { assignedUserId: agentId },
    });
  }

  async addTags(contactId: string, tags: string[], options: RepositoryOptions = {}) {
    const contact = await this.findById(contactId, options);
    if (!contact) throw new Error('Contact not found');

    const currentTags: string[] = contact.tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];

    return this.getModel().update({
      where: this.addOrgFilter({ id: contactId }, options),
      data: { tags: newTags },
    });
  }

  async removeTags(contactId: string, tags: string[], options: RepositoryOptions = {}) {
    const contact = await this.findById(contactId, options);
    if (!contact) throw new Error('Contact not found');

    const newTags = (contact.tags || []).filter((t: string) => !tags.includes(t));

    return this.getModel().update({
      where: this.addOrgFilter({ id: contactId }, options),
      data: { tags: newTags },
    });
  }
}

export const contactRepository = new ContactRepository();


