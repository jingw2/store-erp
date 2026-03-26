import { IsString, IsNotEmpty } from 'class-validator';

export class CsvImportDto {
  @IsString()
  @IsNotEmpty()
  csvContent!: string;
}
