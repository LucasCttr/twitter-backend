import { IsOptional, IsPositive, IsString } from "class-validator";
import { Type } from 'class-transformer';

// Pagination Cursor-Based
export class CursorPaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number;
}
  
