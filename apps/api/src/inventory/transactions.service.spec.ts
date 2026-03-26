import { Test } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';

const mockPrisma = {
  inventoryTransaction: { findMany: jest.fn() },
};
const mockInventory = { applyDelta: jest.fn() };

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventory },
      ],
    }).compile();
    service = module.get(TransactionsService);
  });

  it('listTransactions returns all when no filters', async () => {
    mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
    const result = await service.listTransactions('s1', {});
    expect(result).toEqual([]);
    expect(mockPrisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
      where: { storeId: 's1' },
      orderBy: { createdAt: 'desc' },
      include: { material: true, user: { select: { id: true, name: true } } },
    });
  });

  it('listTransactions applies materialId filter', async () => {
    mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
    await service.listTransactions('s1', { materialId: 'm1' });
    expect(mockPrisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
      where: { storeId: 's1', materialId: 'm1' },
      orderBy: { createdAt: 'desc' },
      include: { material: true, user: { select: { id: true, name: true } } },
    });
  });

  it('listTransactions applies type filter', async () => {
    mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
    await service.listTransactions('s1', { type: InventoryTransactionType.PURCHASE });
    expect(mockPrisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
      where: { storeId: 's1', type: InventoryTransactionType.PURCHASE },
      orderBy: { createdAt: 'desc' },
      include: { material: true, user: { select: { id: true, name: true } } },
    });
  });

  it('listTransactions applies date range filter', async () => {
    mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
    await service.listTransactions('s1', { from: '2024-01-01', to: '2024-12-31' });
    expect(mockPrisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
      where: {
        storeId: 's1',
        createdAt: { gte: new Date('2024-01-01'), lte: new Date('2024-12-31') },
      },
      orderBy: { createdAt: 'desc' },
      include: { material: true, user: { select: { id: true, name: true } } },
    });
  });

  it('createManual throws BadRequestException for disallowed types', async () => {
    await expect(
      service.createManual('t1', 's1', 'u1', {
        materialId: 'm1',
        delta: 10,
        type: InventoryTransactionType.SALE_DEDUCTION,
        note: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('createManual calls applyDelta for PURCHASE', async () => {
    mockInventory.applyDelta.mockResolvedValue({ id: 'tx1' });
    const result = await service.createManual('t1', 's1', 'u1', {
      materialId: 'm1',
      delta: 20,
      type: InventoryTransactionType.PURCHASE,
      note: 'Restocking',
    });
    expect(result).toEqual({ id: 'tx1' });
    expect(mockInventory.applyDelta).toHaveBeenCalledWith(
      't1', 's1', 'm1', 20, InventoryTransactionType.PURCHASE, 'u1', 'Restocking', undefined,
    );
  });
});
