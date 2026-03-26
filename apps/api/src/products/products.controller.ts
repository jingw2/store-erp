import {
  Controller, Get, Post, Patch,
  Param, Body, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.tenantId!, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }
}
