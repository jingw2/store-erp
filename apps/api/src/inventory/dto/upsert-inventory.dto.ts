import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertInventoryDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  safetyStockQty?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  defaultOrderQty?: number;
}
