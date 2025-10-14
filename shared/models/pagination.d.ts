export interface PaginationMeta {
  limit: number;
  offset: number;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
