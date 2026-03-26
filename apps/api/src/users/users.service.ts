import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignUserRegionDto } from './dto/assign-user-region.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({});
    return users.map(({ passwordHash: _pw, ...u }) => u);
  }

  async create(dto: CreateUserDto) {
    const { password, ...rest } = dto;
    const passwordHash = await this.auth.hashPassword(password);
    const user = await this.prisma.user.create({ data: { ...rest, passwordHash } });
    const { passwordHash: _pw, ...result } = user;
    return result;
  }

  async assignRegion(tenantId: string, userId: string, dto: AssignUserRegionDto) {
    const regionExists = await this.prisma.tenantRegion.findFirst({
      where: { tenantId, name: dto.region },
    });
    if (!regionExists) {
      throw new BadRequestException(`Region '${dto.region}' does not exist for this tenant`);
    }
    return this.prisma.userRegion.create({ data: { userId, tenantId, region: dto.region } });
  }

  removeRegion(userId: string, region: string) {
    return this.prisma.userRegion.deleteMany({ where: { userId, region } });
  }
}
