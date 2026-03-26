import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';
import { MaterialType } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @Get()
  findAll(@Query('type') type?: MaterialType) {
    return this.service.findAll(type);
  }

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  create(@Body() dto: CreateMaterialDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.tenantId!, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.service.update(id, dto);
  }
}
