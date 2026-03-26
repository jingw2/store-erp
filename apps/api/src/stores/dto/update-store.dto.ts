import { IsString, IsOptional } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
