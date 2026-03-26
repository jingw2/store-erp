import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric and hyphens only' })
  slug: string;

  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @IsString()
  @IsOptional()
  plan?: string;
}
