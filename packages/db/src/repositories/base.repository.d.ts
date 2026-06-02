import { PrismaClient } from '@prisma/client';
export interface RepositoryOptions {
    organizationId?: string;
    userId?: string;
    skipOrgFilter?: boolean;
}
export declare abstract class BaseRepository<T> {
    protected prisma: PrismaClient;
    protected modelName: string;
    constructor(modelName: string);
    protected getModel(): any;
    protected addOrgFilter(where: any, options: RepositoryOptions): any;
    findById(id: string, options?: RepositoryOptions): Promise<T | null>;
    findAll(options?: RepositoryOptions, pagination?: {
        page: number;
        limit: number;
    }): Promise<T[]>;
    count(options?: RepositoryOptions): Promise<number>;
    create(data: any, options?: RepositoryOptions): Promise<T>;
    update(id: string, data: any, options?: RepositoryOptions): Promise<T>;
    delete(id: string, options?: RepositoryOptions): Promise<T>;
}


