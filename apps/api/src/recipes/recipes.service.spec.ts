import { Test } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

const mockPrisma = {
  productRecipe: {
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  material: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('RecipesService', () => {
  let service: RecipesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(RecipesService);
  });

  it('findByProduct returns recipes for product', async () => {
    mockPrisma.productRecipe.findMany.mockResolvedValue([]);
    const result = await service.findByProduct('p1');
    expect(result).toEqual([]);
    expect(mockPrisma.productRecipe.findMany).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      include: { material: true },
    });
  });

  it('upsert throws BadRequestException when unit does not match material unit', async () => {
    mockPrisma.material.findUnique.mockResolvedValue({ id: 'm1', unit: 'L' });
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
    await expect(
      service.upsert('tenant1', 'p1', {
        sizeVariant: 'standard',
        items: [{ materialId: 'm1', quantity: 0.1, unit: 'ml' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('upsert replaces recipe items in a transaction when units match', async () => {
    mockPrisma.material.findUnique.mockResolvedValue({ id: 'm1', unit: 'L' });
    const created = [{ id: 'r1', productId: 'p1', materialId: 'm1', quantity: 0.1, unit: 'L', sizeVariant: 'standard' }];
    const txMock = {
      productRecipe: {
        deleteMany: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue(created),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
    const result = await service.upsert('tenant1', 'p1', {
      sizeVariant: 'standard',
      items: [{ materialId: 'm1', quantity: 0.1, unit: 'L' }],
    });
    expect(txMock.productRecipe.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'p1', sizeVariant: 'standard' },
    });
    expect(txMock.productRecipe.createMany).toHaveBeenCalledWith({
      data: [{ tenantId: 'tenant1', productId: 'p1', materialId: 'm1', quantity: 0.1, unit: 'L', sizeVariant: 'standard' }],
    });
    expect(result).toEqual(created);
  });

  it('removeItem deletes a single recipe item', async () => {
    mockPrisma.productRecipe.delete.mockResolvedValue({ id: 'r1' });
    await service.removeItem('r1');
    expect(mockPrisma.productRecipe.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
