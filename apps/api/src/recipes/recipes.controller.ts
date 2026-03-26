import {
  Controller, Get, Put, Delete,
  Param, Body, UseGuards, UseInterceptors,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('products/:productId/recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Get()
  findAll(@Param('productId') productId: string) {
    return this.service.findByProduct(productId);
  }

  @Put()
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  upsert(
    @Param('productId') productId: string,
    @Body() dto: UpsertRecipeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.upsert(user.tenantId!, productId, dto);
  }

  @Delete(':id')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@Param('id') id: string) {
    return this.service.removeItem(id);
  }
}
