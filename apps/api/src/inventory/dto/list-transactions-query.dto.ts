import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { InventoryTransactionType } from '@prisma/client';

export class ListTransactionsQueryDto {
  @IsString()
  @IsOptional()
  materialId?: string;

  @IsEnum(InventoryTransactionType)
  @IsOptional()
  type?: InventoryTransactionType;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
