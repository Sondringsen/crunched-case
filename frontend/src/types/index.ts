// Place shared TypeScript interfaces and types here.
// One file per domain entity is also fine for larger projects.

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
