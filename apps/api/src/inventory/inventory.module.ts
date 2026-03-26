import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { TransactionsService } from './transactions.service';
import { CsvImportService } from './csv-import.service';
import { InventoryController } from './inventory.controller';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [PrismaModule, AuthModule, MaterialsModule],
  providers: [InventoryService, TransactionsService, CsvImportService],
  controllers: [InventoryController, TransactionsController],
  exports: [InventoryService],
})
export class InventoryModule {}
