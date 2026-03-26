import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it('findAll returns products', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    expect(await service.findAll()).toEqual([]);
  });

  it('create throws ConflictException on duplicate SKU', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    await expect(
      service.create('tenant1', { name: 'Taro Milk Tea', nameEn: 'Taro', sku: 'TMT-001', category: 'milk-tea' }),
    ).rejects.toThrow(ConflictException);
  });

  it('create inserts product when SKU is unique', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    const product = { id: 'p1', tenantId: 'tenant1', name: 'Taro Milk Tea', nameEn: 'Taro', sku: 'TMT-001', category: 'milk-tea', status: 'active' };
    mockPrisma.product.create.mockResolvedValue(product);
    const result = await service.create('tenant1', { name: 'Taro Milk Tea', nameEn: 'Taro', sku: 'TMT-001', category: 'milk-tea' });
    expect(result).toEqual(product);
    expect(mockPrisma.product.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant1', name: 'Taro Milk Tea', nameEn: 'Taro', sku: 'TMT-001', category: 'milk-tea' },
    });
  });

  it('findOne returns product by id', async () => {
    const product = { id: 'p1', name: 'Taro Milk Tea' };
    mockPrisma.product.findUnique.mockResolvedValue(product);
    expect(await service.findOne('p1')).toEqual(product);
  });

  it('update patches product', async () => {
    const updated = { id: 'p1', name: 'Updated', status: 'inactive' };
    mockPrisma.product.update.mockResolvedValue(updated);
    expect(await service.update('p1', { status: 'inactive' })).toEqual(updated);
  });
});
