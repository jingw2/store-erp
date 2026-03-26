import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { InventoryTransactionType } from '@prisma/client';

const MANUAL_ALLOWED_TYPES = new Set<InventoryTransactionType>([
  InventoryTransactionType.PURCHASE,
  InventoryTransactionType.MANUAL_ADJUSTMENT,
]);

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  listTransactions(storeId: string, query: ListTransactionsQueryDto) {
    const where: Record<string, unknown> = { storeId };
    if (query.materialId) where.materialId = query.materialId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }
    return this.prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { material: true, user: { select: { id: true, name: true } } },
    });
  }

  async createManual(tenantId: string, storeId: string, userId: string, dto: CreateTransactionDto) {
    if (!MANUAL_ALLOWED_TYPES.has(dto.type)) {
      throw new BadRequestException(
        `Type '${dto.type}' is not allowed via this endpoint. Use PURCHASE or MANUAL_ADJUSTMENT.`,
      );
    }
    return this.inventory.applyDelta(
      tenantId, storeId, dto.materialId, dto.delta, dto.type, userId, dto.note ?? '', dto.referenceId,
    );
  }
}
