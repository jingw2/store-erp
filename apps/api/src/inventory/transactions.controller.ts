import {
  Controller, Get, Post,
  Param, Body, Query, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantContextInterceptor } from '../auth/tenant-context.interceptor';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { GlobalRole, AuthUser } from '@store-erp/types';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('stores/:storeId/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  list(@Param('storeId') storeId: string, @Query() query: ListTransactionsQueryDto) {
    return this.service.listTransactions(storeId, query);
  }

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.HQ_ADMIN, GlobalRole.STORE_MANAGER, GlobalRole.STAFF)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createManual(user.tenantId!, storeId, user.userId, dto);
  }
}
