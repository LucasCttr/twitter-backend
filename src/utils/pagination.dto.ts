export class PaginationDto {
  page: number;
  limit: number;

  constructor(page = 1, limit = 10) {
    this.page = page;
    this.limit = limit;
  }
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
