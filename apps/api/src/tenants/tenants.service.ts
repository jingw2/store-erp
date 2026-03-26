import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({});
  }

  create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.tenant.delete({ where: { id } });
  }
}
