#!/usr/bin/env node
// One-shot script to delete orphaned logos from R2.
// Requires: CLOUDFLARE_API_TOKEN env var (your CF API token with R2+D1 permissions)
// Run: CLOUDFLARE_API_TOKEN=xxx node scripts/purge-logos.js

const ACCOUNT_ID = '06e6635a4c9aa924f65c98fa9feba964';
const DB_ID = '749c983e-1b20-4fe5-8906-e7adcc0a0a62';
const BUCKET = 'madrasa-logos';

const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error('Set CLOUDFLARE_API_TOKEN env var before running this script.');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function cfFetch(path, options = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers,
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json.errors));
  return json;
}

// Step 1: query D1 for all referenced logo keys
console.log('Querying D1 for referenced logos...');
const d1Result = await cfFetch(`/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`, {
  method: 'POST',
  body: JSON.stringify({ sql: 'SELECT logo_url FROM schools WHERE logo_url IS NOT NULL' }),
});

const rows = d1Result.result?.[0]?.results ?? [];
const referencedKeys = new Set(
  rows.map(r => r.logo_url?.split('/assets/logos/')[1]).filter(Boolean)
);
console.log(`Referenced keys: ${referencedKeys.size}`);

// Step 2: list all R2 objects (paginate)
console.log('Listing R2 objects...');
const allObjects = [];
let cursor;
do {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const data = await cfFetch(`/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects${qs}`);
  allObjects.push(...(data.result?.objects ?? []));
  cursor = data.result?.truncated ? data.result.cursor : null;
} while (cursor);
console.log(`Total objects in R2: ${allObjects.length}`);

// Step 3: delete orphans
const orphans = allObjects.filter(o => !referencedKeys.has(o.key));
console.log(`Orphaned objects: ${orphans.length}`);

if (orphans.length === 0) {
  console.log('Nothing to delete.');
  process.exit(0);
}

for (const obj of orphans) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(obj.key)}`,
    { method: 'DELETE', headers },
  );
  console.log(`${res.ok ? '✓' : '✗'} ${obj.key}`);
}

console.log('Done.');
