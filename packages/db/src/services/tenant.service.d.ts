export interface CreateOrganizationInput {
    name: string;
    slug: string;
    settings?: Record<string, any>;
}
export interface UpdateOrganizationInput {
    name?: string;
    settings?: Record<string, any>;
}
export declare class OrganizationService {
    create(input: CreateOrganizationInput): Promise<any>;
    update(orgId: string, input: UpdateOrganizationInput): Promise<any>;
    getBySlug(slug: string): Promise<any>;
    getById(orgId: string): Promise<any>;
    delete(orgId: string): Promise<any>;
    getStats(orgId: string): Promise<{
        users: any;
        contacts: any;
        messages: any;
        campaigns: any;
        calls: any;
    }>;
    private seedSystemRoles;
    private seedDefaultWidgets;
}
export declare const organizationService: OrganizationService;


