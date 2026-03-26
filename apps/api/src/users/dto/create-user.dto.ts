import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { GlobalRole } from '@store-erp/types';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(GlobalRole)
  globalRole: GlobalRole;

  @IsString()
  @IsOptional()
  tenantId?: string;
}
