/**
 * Builds a partial update object, filtering out undefined and null values.
 * This replaces the COALESCE pattern from raw SQL.
 */
export function buildPartialUpdate<T extends Record<string, unknown>>(
  data: Partial<T>,
  allowedFields: (keyof T)[]
): Partial<T> {
  const updates: Partial<T> = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  return updates;
}
