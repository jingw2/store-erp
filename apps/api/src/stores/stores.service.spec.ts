import { Test } from '@nestjs/testing';
import { StoresService } from './stores.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

const mockPrisma = {
  store: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  tenantRegion: {
    findFirst: jest.fn(),
  },
};

describe('StoresService', () => {
  let service: StoresService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(StoresService);
  });

  it('findAll returns stores', async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    expect(await service.findAll()).toEqual([]);
    expect(mockPrisma.store.findMany).toHaveBeenCalledWith({});
  });

  it('create throws BadRequestException when region does not exist', async () => {
    mockPrisma.tenantRegion.findFirst.mockResolvedValue(null);
    await expect(
      service.create('tenant1', { name: 'KL Store', region: 'Unknown', timezone: 'Asia/Kuala_Lumpur' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('create succeeds when region exists', async () => {
    mockPrisma.tenantRegion.findFirst.mockResolvedValue({ id: 'r1', name: 'KL' });
    const store = { id: 's1', tenantId: 'tenant1', name: 'KL Store', region: 'KL', timezone: 'Asia/Kuala_Lumpur', status: 'active', createdAt: new Date() };
    mockPrisma.store.create.mockResolvedValue(store);
    const result = await service.create('tenant1', { name: 'KL Store', region: 'KL', timezone: 'Asia/Kuala_Lumpur' });
    expect(result).toEqual(store);
    expect(mockPrisma.store.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant1', name: 'KL Store', region: 'KL', timezone: 'Asia/Kuala_Lumpur' },
    });
  });

  it('findOne returns store by id', async () => {
    const store = { id: 's1', name: 'KL Store' };
    mockPrisma.store.findUnique.mockResolvedValue(store);
    expect(await service.findOne('s1')).toEqual(store);
    expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('update patches store fields', async () => {
    const updated = { id: 's1', name: 'New Name', region: 'KL', status: 'active' };
    mockPrisma.store.update.mockResolvedValue(updated);
    expect(await service.update('s1', { name: 'New Name' })).toEqual(updated);
    expect(mockPrisma.store.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { name: 'New Name' } });
  });
});
