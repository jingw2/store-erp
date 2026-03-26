import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { InventoryTransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsNumber()
  delta!: number;

  @IsEnum(InventoryTransactionType)
  type!: InventoryTransactionType;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
