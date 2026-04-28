/**
 * Generic KV cache wrapper for expensive queries.
 * Usage: withKVCache(cache, 'my-key', 300, () => expensiveQuery())
 */
export async function withKVCache<T>(
  cache: KVNamespace,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cache.get(key, 'json');
  if (cached) return cached as T;

  const result = await fn();
  await cache.put(key, JSON.stringify(result), { expirationTtl: ttlSeconds });
  return result;
}

export async function invalidateCache(cache: KVNamespace, key: string) {
  await cache.delete(key);
}
