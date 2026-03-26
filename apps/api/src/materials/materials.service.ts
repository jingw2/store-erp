import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialType } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(type: MaterialType | undefined) {
    return this.prisma.material.findMany({ where: type ? { type } : {} });
  }

  create(tenantId: string, dto: CreateMaterialDto) {
    return this.prisma.material.create({ data: { tenantId, ...dto } });
  }

  findOne(id: string) {
    return this.prisma.material.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateMaterialDto) {
    return this.prisma.material.update({ where: { id }, data: dto });
  }
}
