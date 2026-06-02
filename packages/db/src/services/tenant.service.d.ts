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
    create(input: CreateOrganizationInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        deletedAt: Date | null;
    }>;
    update(orgId: string, input: UpdateOrganizationInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        deletedAt: Date | null;
    }>;
    getBySlug(slug: string): Promise<{
        _count: {
            users: number;
            contacts: number;
            campaigns: number;
        };
        users: {
            id: string;
            organizationId: string | null;
            createdAt: Date;
            updatedAt: Date;
            settings: import("@prisma/client/runtime/library").JsonValue;
            email: string;
            passwordHash: string | null;
            fullName: string | null;
            roleId: string | null;
            twoFactorSecret: string | null;
            twoFactorEnabled: boolean;
            isActive: boolean;
            isAvailable: boolean;
            isSuperAdmin: boolean;
            ssoProvider: string | null;
            ssoProviderId: string | null;
            lastLoginAt: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        deletedAt: Date | null;
    }>;
    getById(orgId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        deletedAt: Date | null;
    }>;
    delete(orgId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        deletedAt: Date | null;
    }>;
    getStats(orgId: string): Promise<{
        users: number;
        contacts: number;
        messages: number;
        campaigns: number;
        calls: number;
    }>;
    private seedSystemRoles;
    private seedDefaultWidgets;
}
export declare const organizationService: OrganizationService;
//# sourceMappingURL=tenant.service.d.ts.map