import { Test } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  tenant: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TenantsService);
  });

  it('findAll returns list of tenants', async () => {
    const tenants = [{ id: 't1', name: 'Tea Co', slug: 'tea-co' }];
    mockPrisma.tenant.findMany.mockResolvedValue(tenants);
    const result = await service.findAll();
    expect(result).toEqual(tenants);
    expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({});
  });

  it('create inserts tenant with provided fields', async () => {
    const dto = { name: 'New Brand', slug: 'new-brand' };
    const created = { id: 't2', ...dto, defaultLocale: 'zh', plan: 'starter', createdAt: new Date() };
    mockPrisma.tenant.create.mockResolvedValue(created);
    const result = await service.create(dto);
    expect(result).toEqual(created);
    expect(mockPrisma.tenant.create).toHaveBeenCalledWith({ data: dto });
  });

  it('findOne returns single tenant', async () => {
    const tenant = { id: 't1', name: 'Tea Co', slug: 'tea-co' };
    mockPrisma.tenant.findUnique.mockResolvedValue(tenant);
    const result = await service.findOne('t1');
    expect(result).toEqual(tenant);
    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('update patches tenant fields', async () => {
    const updated = { id: 't1', name: 'Tea Co Updated', slug: 'tea-co', defaultLocale: 'zh', plan: 'pro', createdAt: new Date() };
    mockPrisma.tenant.update.mockResolvedValue(updated);
    const result = await service.update('t1', { plan: 'pro' });
    expect(result).toEqual(updated);
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { plan: 'pro' } });
  });

  it('remove deletes tenant by id', async () => {
    mockPrisma.tenant.delete.mockResolvedValue({ id: 't1' });
    await service.remove('t1');
    expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
