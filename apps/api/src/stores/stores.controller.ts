import {
  Controller, Get, Post, Patch,
  Param, Body, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('stores')
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  create(@Body() dto: CreateStoreDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.tenantId!, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.service.update(id, dto);
  }
}
