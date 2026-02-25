import { IsDefined, IsPositive } from "class-validator";
import { Type } from 'class-transformer';

// Pagination Response Cursor-Based 
export class PaginatedResponse<T> {
  data: T[];
  limit: number;
  nextCursor: string | null;

  constructor(data: T[], limit: number, nextCursor: string | null = null) {
    this.data = data;
    this.limit = limit;
    this.nextCursor = nextCursor;
  }
}
