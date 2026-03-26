import { Module } from '@nestjs/common';
import { TenantRegionsService } from './tenant-regions.service';
import { TenantRegionsController } from './tenant-regions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TenantRegionsService],
  controllers: [TenantRegionsController],
  exports: [TenantRegionsService],
})
export class TenantRegionsModule {}
