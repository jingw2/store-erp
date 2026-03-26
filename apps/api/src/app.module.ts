import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantRegionsModule } from './tenant-regions/tenant-regions.module';
import { StoresModule } from './stores/stores.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { MaterialsModule } from './materials/materials.module';
import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    TenantRegionsModule,
    StoresModule,
    UsersModule,
    ProductsModule,
    MaterialsModule,
    RecipesModule,
  ],
})
export class AppModule {}
