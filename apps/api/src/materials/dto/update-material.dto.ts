import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MaterialType } from '@prisma/client';

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsEnum(MaterialType)
  @IsOptional()
  type?: MaterialType;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  spec?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
