import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({});
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { tenantId, sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException(`SKU '${dto.sku}' already exists`);
    }
    return this.prisma.product.create({ data: { tenantId, ...dto } });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }
}
