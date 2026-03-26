import { Test } from '@nestjs/testing';
import { MaterialsService } from './materials.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaterialType } from '@prisma/client';

const mockPrisma = {
  material: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('MaterialsService', () => {
  let service: MaterialsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(MaterialsService);
  });

  it('findAll with no type filter returns all materials', async () => {
    mockPrisma.material.findMany.mockResolvedValue([]);
    await service.findAll(undefined);
    expect(mockPrisma.material.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('findAll with type filter passes where clause', async () => {
    mockPrisma.material.findMany.mockResolvedValue([]);
    await service.findAll(MaterialType.INGREDIENT);
    expect(mockPrisma.material.findMany).toHaveBeenCalledWith({ where: { type: MaterialType.INGREDIENT } });
  });

  it('create inserts material', async () => {
    const dto = { name: 'Milk', nameEn: 'Milk', type: MaterialType.INGREDIENT, unit: 'L', spec: 'Full cream' };
    const material = { id: 'm1', tenantId: 'tenant1', ...dto, status: 'active' };
    mockPrisma.material.create.mockResolvedValue(material);
    const result = await service.create('tenant1', dto);
    expect(result).toEqual(material);
    expect(mockPrisma.material.create).toHaveBeenCalledWith({ data: { tenantId: 'tenant1', ...dto } });
  });

  it('findOne returns material by id', async () => {
    const material = { id: 'm1', name: 'Milk' };
    mockPrisma.material.findUnique.mockResolvedValue(material);
    expect(await service.findOne('m1')).toEqual(material);
  });

  it('update patches material', async () => {
    const updated = { id: 'm1', status: 'inactive' };
    mockPrisma.material.update.mockResolvedValue(updated);
    expect(await service.update('m1', { status: 'inactive' })).toEqual(updated);
  });
});
