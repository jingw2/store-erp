import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTenantRegionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
