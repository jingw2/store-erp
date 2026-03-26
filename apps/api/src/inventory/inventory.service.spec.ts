import { Test } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';

const txMock = {
  storeInventory: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  inventoryTransaction: { create: jest.fn() },
  material: { findUnique: jest.fn() },
};

const mockPrisma = {
  storeInventory: { findMany: jest.fn(), upsert: jest.fn() },
  material: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it('findByStore returns inventory with material included', async () => {
    mockPrisma.storeInventory.findMany.mockResolvedValue([]);
    const result = await service.findByStore('s1');
    expect(result).toEqual([]);
    expect(mockPrisma.storeInventory.findMany).toHaveBeenCalledWith({
      where: { storeId: 's1' },
      include: { material: true },
    });
  });

  it('applyDelta throws BadRequestException when material not found', async () => {
    txMock.material.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
    await expect(
      service.applyDelta('t1', 's1', 'bad-id', 10, InventoryTransactionType.PURCHASE, 'u1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('applyDelta creates new StoreInventory when none exists', async () => {
    txMock.material.findUnique.mockResolvedValue({ id: 'm1', unit: 'L' });
    txMock.storeInventory.findUnique.mockResolvedValue(null);
    txMock.storeInventory.create.mockResolvedValue({});
    txMock.inventoryTransaction.create.mockResolvedValue({ id: 'tx1' });
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

    await service.applyDelta('t1', 's1', 'm1', 50, InventoryTransactionType.INITIAL_IMPORT, 'u1', 'First load');

    expect(txMock.storeInventory.create).toHaveBeenCalledWith({
      data: { tenantId: 't1', storeId: 's1', materialId: 'm1', currentQty: 50, unit: 'L' },
    });
    expect(txMock.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1', storeId: 's1', materialId: 'm1',
        delta: 50, type: InventoryTransactionType.INITIAL_IMPORT,
        createdBy: 'u1', note: 'First load',
      }),
    });
  });

  it('applyDelta increments existing StoreInventory', async () => {
    txMock.material.findUnique.mockResolvedValue({ id: 'm1', unit: 'L' });
    txMock.storeInventory.findUnique.mockResolvedValue({ id: 'inv1', currentQty: 100 });
    txMock.storeInventory.update.mockResolvedValue({});
    txMock.inventoryTransaction.create.mockResolvedValue({ id: 'tx1' });
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));

    await service.applyDelta('t1', 's1', 'm1', 20, InventoryTransactionType.PURCHASE, 'u1');

    expect(txMock.storeInventory.update).toHaveBeenCalledWith({
      where: { storeId_materialId: { storeId: 's1', materialId: 'm1' } },
      data: { currentQty: { increment: 20 } },
    });
  });

  it('upsertSettings creates or updates safety/order qty without changing currentQty', async () => {
    mockPrisma.storeInventory.upsert.mockResolvedValue({ id: 'inv1' });
    const result = await service.upsertSettings('t1', 's1', 'm1', 'L', {
      safetyStockQty: 10,
      defaultOrderQty: 50,
    });
    expect(result).toEqual({ id: 'inv1' });
    expect(mockPrisma.storeInventory.upsert).toHaveBeenCalledWith({
      where: { storeId_materialId: { storeId: 's1', materialId: 'm1' } },
      create: { tenantId: 't1', storeId: 's1', materialId: 'm1', unit: 'L', safetyStockQty: 10, defaultOrderQty: 50 },
      update: { safetyStockQty: 10, defaultOrderQty: 50 },
    });
  });
});
