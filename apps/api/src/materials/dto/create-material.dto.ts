import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsEnum(MaterialType)
  @IsNotEmpty()
  type!: MaterialType;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  @IsOptional()
  spec?: string;
}
