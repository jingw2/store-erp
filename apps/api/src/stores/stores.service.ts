import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.store.findMany({});
  }

  async create(tenantId: string, dto: CreateStoreDto) {
    const regionExists = await this.prisma.tenantRegion.findFirst({
      where: { tenantId, name: dto.region },
    });
    if (!regionExists) {
      throw new BadRequestException(`Region '${dto.region}' does not exist for this tenant`);
    }
    return this.prisma.store.create({ data: { tenantId, ...dto } });
  }

  findOne(id: string) {
    return this.prisma.store.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateStoreDto) {
    return this.prisma.store.update({ where: { id }, data: dto });
  }
}
