import { verify } from 'hono/jwt';
import type { Next } from 'hono';
import type { AppContext } from '../types';

async function extractPayload(c: AppContext) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return await verify(header.slice(7), c.env.JWT_SECRET, 'HS256');
  } catch {
    return null;
  }
}

export async function requireAdmin(c: AppContext, next: Next) {
  const payload = await extractPayload(c);
  if (!payload || payload['role'] !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('schoolId', payload['schoolId'] as number);
  c.set('userId', payload['userId'] as string);
  await next();
}

export async function requireSuperAdmin(c: AppContext, next: Next) {
  const payload = await extractPayload(c);
  if (!payload || payload['role'] !== 'super_admin') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('userId', payload['userId'] as string);
  await next();
}
