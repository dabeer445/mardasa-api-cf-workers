import { sql, SQL, count } from 'drizzle-orm';
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Database } from '../client';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function paginate<T extends SQLiteTable>(
  db: Database,
  table: T,
  params: PaginationParams,
  options?: {
    where?: SQL;
    orderBy?: SQLiteColumn;
    orderDirection?: 'asc' | 'desc';
  }
): Promise<PaginatedResult<T['$inferSelect']>> {
  const { page, limit } = params;
  const offset = (page - 1) * limit;

  // Get total count
  const countQuery = options?.where
    ? db.select({ count: count() }).from(table).where(options.where)
    : db.select({ count: count() }).from(table);

  const [countResult] = await countQuery;
  const total = countResult?.count ?? 0;

  // Get paginated data
  let dataQuery = db.select().from(table);

  if (options?.where) {
    dataQuery = dataQuery.where(options.where) as typeof dataQuery;
  }

  if (options?.orderBy) {
    if (options.orderDirection === 'asc') {
      dataQuery = dataQuery.orderBy(options.orderBy) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(sql`${options.orderBy} DESC`) as typeof dataQuery;
    }
  }

  const data = await dataQuery.limit(limit).offset(offset);

  return {
    data: data as T['$inferSelect'][],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
