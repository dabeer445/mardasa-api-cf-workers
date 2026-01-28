import { eq, like, and, gte, lte, or, SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

type FilterCondition = SQL | undefined;

export class FilterBuilder {
  private conditions: FilterCondition[] = [];

  eq<T>(column: SQLiteColumn, value: T | undefined | null): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(eq(column, value));
    }
    return this;
  }

  like(column: SQLiteColumn, value: string | undefined | null): this {
    if (value !== undefined && value !== null && value !== '') {
      this.conditions.push(like(column, `%${value}%`));
    }
    return this;
  }

  gte<T>(column: SQLiteColumn, value: T | undefined | null): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(gte(column, value));
    }
    return this;
  }

  lte<T>(column: SQLiteColumn, value: T | undefined | null): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(lte(column, value));
    }
    return this;
  }

  search(columns: SQLiteColumn[], value: string | undefined | null): this {
    if (value !== undefined && value !== null && value !== '') {
      const orConditions = columns.map(col => like(col, `%${value}%`));
      if (orConditions.length > 0) {
        this.conditions.push(or(...orConditions));
      }
    }
    return this;
  }

  build(): SQL | undefined {
    const validConditions = this.conditions.filter((c): c is SQL => c !== undefined);
    if (validConditions.length === 0) return undefined;
    if (validConditions.length === 1) return validConditions[0];
    return and(...validConditions);
  }
}

export function createFilter(): FilterBuilder {
  return new FilterBuilder();
}
