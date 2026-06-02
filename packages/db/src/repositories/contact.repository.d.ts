import { BaseRepository, RepositoryOptions } from './base.repository';
export interface ContactFilter {
    search?: string;
    tags?: string[];
    assignedUserId?: string;
    isRead?: boolean;
}
export declare class ContactRepository extends BaseRepository<any> {
    constructor();
    findByPhoneNumber(phoneNumber: string, options?: RepositoryOptions): Promise<any>;
    findWithFilters(filters: ContactFilter, options?: RepositoryOptions, pagination?: {
        page: number;
        limit: number;
    }): Promise<any>;
    getUnreadCount(assignedUserId: string, options?: RepositoryOptions): Promise<any>;
    assignToAgent(contactId: string, agentId: string, options?: RepositoryOptions): Promise<any>;
    addTags(contactId: string, tags: string[], options?: RepositoryOptions): Promise<any>;
    removeTags(contactId: string, tags: string[], options?: RepositoryOptions): Promise<any>;
}
export declare const contactRepository: ContactRepository;
//# sourceMappingURL=contact.repository.d.ts.map