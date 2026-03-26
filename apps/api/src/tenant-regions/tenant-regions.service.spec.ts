import { Test } from '@nestjs/testing';
import { TenantRegionsService } from './tenant-regions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

const mockPrisma = {
  tenantRegion: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TenantRegionsService', () => {
  let service: TenantRegionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TenantRegionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TenantRegionsService);
  });

  it('findAll returns tenant regions', async () => {
    mockPrisma.tenantRegion.findMany.mockResolvedValue([]);
    const result = await service.findAll();
    expect(result).toEqual([]);
    expect(mockPrisma.tenantRegion.findMany).toHaveBeenCalledWith({});
  });

  it('create throws ConflictException if region name already exists', async () => {
    mockPrisma.tenantRegion.findFirst.mockResolvedValue({ id: 'r1', name: 'East' });
    await expect(service.create('tenant1', { name: 'East' })).rejects.toThrow(ConflictException);
  });

  it('create inserts new region when name is unique', async () => {
    mockPrisma.tenantRegion.findFirst.mockResolvedValue(null);
    const region = { id: 'r1', tenantId: 'tenant1', name: 'West' };
    mockPrisma.tenantRegion.create.mockResolvedValue(region);
    const result = await service.create('tenant1', { name: 'West' });
    expect(result).toEqual(region);
    expect(mockPrisma.tenantRegion.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant1', name: 'West' },
    });
  });

  it('remove deletes region by id', async () => {
    mockPrisma.tenantRegion.delete.mockResolvedValue({ id: 'r1' });
    await service.remove('r1');
    expect(mockPrisma.tenantRegion.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
