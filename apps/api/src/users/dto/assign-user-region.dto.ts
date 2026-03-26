import { IsString, IsNotEmpty } from 'class-validator';

export class AssignUserRegionDto {
  @IsString()
  @IsNotEmpty()
  region: string;
}
