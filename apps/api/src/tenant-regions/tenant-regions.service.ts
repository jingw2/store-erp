import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantRegionDto } from './dto/create-tenant-region.dto';

@Injectable()
export class TenantRegionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenantRegion.findMany({});
  }

  async create(tenantId: string, dto: CreateTenantRegionDto) {
    const existing = await this.prisma.tenantRegion.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Region '${dto.name}' already exists`);
    }
    return this.prisma.tenantRegion.create({ data: { tenantId, name: dto.name } });
  }

  remove(id: string) {
    return this.prisma.tenantRegion.delete({ where: { id } });
  }
}
