import {
  Controller, Get, Post, Delete,
  Param, Body, UseGuards, UseInterceptors,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { TenantRegionsService } from './tenant-regions.service';
import { CreateTenantRegionDto } from './dto/create-tenant-region.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('tenant-regions')
export class TenantRegionsController {
  constructor(private readonly service: TenantRegionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  create(@Body() dto: CreateTenantRegionDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.tenantId!, dto);
  }

  @Delete(':id')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
