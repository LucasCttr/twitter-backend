import { IsOptional, IsPositive, IsString, Max } from "class-validator";
import { Type } from 'class-transformer';

// Pagination Cursor-Based
export class CursorPaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsPositive()
  @Max(50)
  @Type(() => Number)
  limit?: number;
}
  
