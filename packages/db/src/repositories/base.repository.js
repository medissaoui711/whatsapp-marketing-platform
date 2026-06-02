"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const index_1 = require("../index");
class BaseRepository {
    constructor(modelName) {
        this.prisma = index_1.prisma;
        this.modelName = modelName;
    }
    getModel() {
        return this.prisma[this.modelName];
    }
    addOrgFilter(where, options) {
        if (options.skipOrgFilter || !options.organizationId)
            return where;
        return { ...where, organizationId: options.organizationId };
    }
    async findById(id, options = {}) {
        return this.getModel().findFirst({ where: this.addOrgFilter({ id }, options) });
    }
    async findAll(options = {}, pagination) {
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
    async count(options = {}) {
        return this.getModel().count({ where: this.addOrgFilter({}, options) });
    }
    async create(data, options = {}) {
        if (options.organizationId && !data.organizationId) {
            data.organizationId = options.organizationId;
        }
        return this.getModel().create({ data });
    }
    async update(id, data, options = {}) {
        return this.getModel().update({ where: this.addOrgFilter({ id }, options), data });
    }
    async delete(id, options = {}) {
        return this.getModel().delete({ where: this.addOrgFilter({ id }, options) });
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map