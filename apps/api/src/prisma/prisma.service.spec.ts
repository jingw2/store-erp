import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { GlobalRole } from '@store-erp/types';

describe('PrismaService – tenant middleware', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    prisma = module.get(PrismaService);
  });

  it('should expose tenant context inside runWithTenantContext for HQ_ADMIN', () => {
    prisma.runWithTenantContext('tenant-abc', GlobalRole.HQ_ADMIN, () => {
      const ctx = prisma.getTenantContext();
      expect(ctx?.tenantId).toBe('tenant-abc');
      expect(ctx?.isSuperAdmin).toBe(false);
    });
  });

  it('should set isSuperAdmin=true and tenantId=null for SUPER_ADMIN', () => {
    prisma.runWithTenantContext(null, GlobalRole.SUPER_ADMIN, () => {
      const ctx = prisma.getTenantContext();
      expect(ctx?.isSuperAdmin).toBe(true);
      expect(ctx?.tenantId).toBeNull();
    });
  });

  it('should return undefined for context outside runWithTenantContext', () => {
    expect(prisma.getTenantContext()).toBeUndefined();
  });

  it('should isolate context between concurrent runs', async () => {
    const results: string[] = [];
    await Promise.all([
      new Promise<void>(resolve =>
        prisma.runWithTenantContext('tenant-A', GlobalRole.HQ_ADMIN, () => {
          setTimeout(() => {
            results.push(prisma.getTenantContext()?.tenantId ?? 'none');
            resolve();
          }, 10);
        }),
      ),
      new Promise<void>(resolve =>
        prisma.runWithTenantContext('tenant-B', GlobalRole.HQ_ADMIN, () => {
          setTimeout(() => {
            results.push(prisma.getTenantContext()?.tenantId ?? 'none');
            resolve();
          }, 5);
        }),
      ),
    ]);
    expect(results).toContain('tenant-A');
    expect(results).toContain('tenant-B');
  });
});
