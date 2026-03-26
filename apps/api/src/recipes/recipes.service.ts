import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  findByProduct(productId: string) {
    return this.prisma.productRecipe.findMany({
      where: { productId },
      include: { material: true },
    });
  }

  async upsert(tenantId: string, productId: string, dto: UpsertRecipeDto) {
    const sizeVariant = dto.sizeVariant ?? 'standard';

    // Validate units match material canonical units
    for (const item of dto.items) {
      const material = await this.prisma.material.findUnique({ where: { id: item.materialId } });
      if (!material) {
        throw new BadRequestException(`Material '${item.materialId}' not found`);
      }
      if (material.unit !== item.unit) {
        throw new BadRequestException(
          `Unit '${item.unit}' does not match material unit '${material.unit}' for material '${item.materialId}'`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productRecipe.deleteMany({ where: { productId, sizeVariant } });
      await tx.productRecipe.createMany({
        data: dto.items.map((item) => ({
          tenantId,
          productId,
          materialId: item.materialId,
          quantity: item.quantity,
          unit: item.unit,
          sizeVariant,
        })),
      });
      return tx.productRecipe.findMany({ where: { productId, sizeVariant } });
    });
  }

  removeItem(id: string) {
    return this.prisma.productRecipe.delete({ where: { id } });
  }
}
