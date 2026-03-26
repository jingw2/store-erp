import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryTransactionType } from '@prisma/client';
import { UpsertInventoryDto } from './dto/upsert-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  findByStore(storeId: string) {
    return this.prisma.storeInventory.findMany({
      where: { storeId },
      include: { material: true },
    });
  }

  upsertSettings(
    tenantId: string,
    storeId: string,
    materialId: string,
    unit: string,
    dto: UpsertInventoryDto,
  ) {
    return this.prisma.storeInventory.upsert({
      where: { storeId_materialId: { storeId, materialId } },
      create: { tenantId, storeId, materialId, unit, ...dto },
      update: { ...dto },
    });
  }

  async applyDelta(
    tenantId: string,
    storeId: string,
    materialId: string,
    delta: number,
    type: InventoryTransactionType,
    userId: string,
    note = '',
    referenceId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) {
        throw new BadRequestException(`Material '${materialId}' not found`);
      }

      const existing = await tx.storeInventory.findUnique({
        where: { storeId_materialId: { storeId, materialId } },
      });

      if (existing) {
        await tx.storeInventory.update({
          where: { storeId_materialId: { storeId, materialId } },
          data: { currentQty: { increment: delta } },
        });
      } else {
        await tx.storeInventory.create({
          data: { tenantId, storeId, materialId, currentQty: delta, unit: material.unit },
        });
      }

      return tx.inventoryTransaction.create({
        data: { tenantId, storeId, materialId, delta, type, createdBy: userId, note, referenceId },
      });
    });
  }
}
