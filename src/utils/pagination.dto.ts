import { IsDefined, IsPositive } from "class-validator";
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsDefined()
  @IsPositive()
  @Type(() => Number)
  page!: number;

  @IsDefined()
  @IsPositive()
  @Type(() => Number)
  limit!: number;
}

export class PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}
