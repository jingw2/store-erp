import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { GlobalRole, isSuperAdmin } from '@store-erp/types';

interface TenantContext {
  tenantId: string | null;
  isSuperAdmin: boolean;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();

    this.$use(async (params, next) => {
      const ctx = tenantStorage.getStore();

      if (!ctx || ctx.isSuperAdmin) {
        return next(params);
      }

      const tenantId = ctx.tenantId;
      if (!tenantId) return next(params);

      if (params.action === 'create') {
        params.args.data = { ...params.args.data, tenantId };
      }
      if (params.action === 'createMany') {
        params.args.data = params.args.data.map((d: Record<string, unknown>) => ({
          ...d,
          tenantId,
        }));
      }

      const readActions = ['findFirst', 'findUnique', 'findMany', 'count', 'aggregate'];
      const writeActions = ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'];

      if (readActions.includes(params.action) || writeActions.includes(params.action)) {
        params.args.where = { ...params.args.where, tenantId };
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  runWithTenantContext<T>(
    tenantId: string | null,
    role: GlobalRole,
    fn: () => T,
  ): T {
    return tenantStorage.run({ tenantId, isSuperAdmin: isSuperAdmin(role) }, fn);
  }

  getTenantContext(): TenantContext | undefined {
    return tenantStorage.getStore();
  }
}
