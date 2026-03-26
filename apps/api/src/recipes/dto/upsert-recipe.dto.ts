import { IsString, IsNotEmpty, IsNumber, IsPositive, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;
}

export class UpsertRecipeDto {
  @IsString()
  @IsOptional()
  sizeVariant?: string;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}
