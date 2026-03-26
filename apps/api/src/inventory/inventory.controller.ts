import {
  Controller, Get, Put, Post,
  Param, Body, UseGuards, UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CsvImportService } from './csv-import.service';
import { UpsertInventoryDto } from './dto/upsert-inventory.dto';
import { CsvImportDto } from './dto/csv-import.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';
import { MaterialsService } from '../materials/materials.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('stores/:storeId/inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly csvImportService: CsvImportService,
    private readonly materialsService: MaterialsService,
  ) {}

  @Get()
  findByStore(@Param('storeId') storeId: string) {
    return this.inventoryService.findByStore(storeId);
  }

  @Put(':materialId')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN, GlobalRole.STORE_MANAGER)
  async upsertSettings(
    @Param('storeId') storeId: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpsertInventoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const material = await this.materialsService.findOne(materialId);
    if (!material) throw new NotFoundException(`Material '${materialId}' not found`);
    return this.inventoryService.upsertSettings(user.tenantId!, storeId, materialId, material.unit, dto);
  }

  @Post('csv-import')
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN, GlobalRole.STORE_MANAGER, GlobalRole.STAFF)
  csvImport(
    @Param('storeId') storeId: string,
    @Body() dto: CsvImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.csvImportService.bulkImport(user.tenantId!, storeId, user.userId, dto.csvContent);
  }
}
