"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactRepository = exports.ContactRepository = void 0;
const base_repository_1 = require("./base.repository");
class ContactRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('contact');
    }
    async findByPhoneNumber(phoneNumber, options = {}) {
        return this.getModel().findFirst({
            where: this.addOrgFilter({ phoneNumber }, options),
        });
    }
    async findWithFilters(filters, options = {}, pagination) {
        const where = this.addOrgFilter({}, options);
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
        const orderBy = { lastMessageAt: 'desc' };
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
    async getUnreadCount(assignedUserId, options = {}) {
        return this.getModel().count({
            where: this.addOrgFilter({ assignedUserId, isRead: false }, options),
        });
    }
    async assignToAgent(contactId, agentId, options = {}) {
        return this.getModel().update({
            where: this.addOrgFilter({ id: contactId }, options),
            data: { assignedUserId: agentId },
        });
    }
    async addTags(contactId, tags, options = {}) {
        const contact = await this.findById(contactId, options);
        if (!contact)
            throw new Error('Contact not found');
        const currentTags = contact.tags || [];
        const newTags = [...new Set([...currentTags, ...tags])];
        return this.getModel().update({
            where: this.addOrgFilter({ id: contactId }, options),
            data: { tags: newTags },
        });
    }
    async removeTags(contactId, tags, options = {}) {
        const contact = await this.findById(contactId, options);
        if (!contact)
            throw new Error('Contact not found');
        const newTags = (contact.tags || []).filter((t) => !tags.includes(t));
        return this.getModel().update({
            where: this.addOrgFilter({ id: contactId }, options),
            data: { tags: newTags },
        });
    }
}
exports.ContactRepository = ContactRepository;
exports.contactRepository = new ContactRepository();
//# sourceMappingURL=contact.repository.js.map