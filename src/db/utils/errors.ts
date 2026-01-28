import { Context } from 'hono';

interface DbError {
  message: string;
  statusCode: number;
}

/**
 * Parse database errors and return user-friendly messages
 */
export function parseDbError(error: unknown): DbError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCause = error instanceof Error && 'cause' in error
    ? String((error as any).cause?.message || '')
    : '';

  // Foreign key constraint violation
  if (errorMessage.includes('FOREIGN KEY constraint failed') ||
      errorCause.includes('FOREIGN KEY constraint failed')) {
    return {
      message: 'Referenced record does not exist. Please check that all IDs reference valid records.',
      statusCode: 400,
    };
  }

  // Unique constraint violation
  if (errorMessage.includes('UNIQUE constraint failed') ||
      errorCause.includes('UNIQUE constraint failed')) {
    const match = errorMessage.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
    const field = match ? match[2] : 'field';
    return {
      message: `A record with this ${field} already exists.`,
      statusCode: 409,
    };
  }

  // Not null constraint violation
  if (errorMessage.includes('NOT NULL constraint failed') ||
      errorCause.includes('NOT NULL constraint failed')) {
    const match = errorMessage.match(/NOT NULL constraint failed: (\w+)\.(\w+)/);
    const field = match ? match[2] : 'field';
    return {
      message: `The field '${field}' is required and cannot be empty.`,
      statusCode: 400,
    };
  }

  // Check constraint violation
  if (errorMessage.includes('CHECK constraint failed') ||
      errorCause.includes('CHECK constraint failed')) {
    return {
      message: 'Invalid value provided. Please check the allowed values.',
      statusCode: 400,
    };
  }

  // Default: generic database error
  return {
    message: 'Database operation failed. Please try again.',
    statusCode: 500,
  };
}

/**
 * Wrapper to handle database operations with proper error responses
 */
export async function withDbErrorHandling<T>(
  c: Context,
  operation: () => Promise<T>
): Promise<T | Response> {
  try {
    return await operation();
  } catch (error) {
    console.error('Database error:', error);
    const { message, statusCode } = parseDbError(error);
    return c.json({ success: false, error: message }, statusCode as any);
  }
}
