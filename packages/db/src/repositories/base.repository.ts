import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';

export interface RepositoryOptions {
  organizationId?: string;
  userId?: string;
  skipOrgFilter?: boolean;
}

export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  protected getModel(): any {
    return (this.prisma as any)[this.modelName];
  }

  protected addOrgFilter(where: any, options: RepositoryOptions): any {
    if (options.skipOrgFilter || !options.organizationId) return where;
    return { ...where, organizationId: options.organizationId };
  }

  async findById(id: string, options: RepositoryOptions = {}): Promise<T | null> {
    return this.getModel().findFirst({ where: this.addOrgFilter({ id }, options) });
  }

  async findAll(
    options: RepositoryOptions = {},
    pagination?: { page: number; limit: number },
  ): Promise<T[]> {
    const where = this.addOrgFilter({}, options);
    if (pagination) {
      return this.getModel().findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.getModel().findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async count(options: RepositoryOptions = {}): Promise<number> {
    return this.getModel().count({ where: this.addOrgFilter({}, options) });
  }

  async create(data: any, options: RepositoryOptions = {}): Promise<T> {
    if (options.organizationId && !data.organizationId) {
      data.organizationId = options.organizationId;
    }
    return this.getModel().create({ data });
  }

  async update(id: string, data: any, options: RepositoryOptions = {}): Promise<T> {
    return this.getModel().update({ where: this.addOrgFilter({ id }, options), data });
  }

  async delete(id: string, options: RepositoryOptions = {}): Promise<T> {
    return this.getModel().delete({ where: this.addOrgFilter({ id }, options) });
  }
}


