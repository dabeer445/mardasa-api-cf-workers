# Frontend Caching Guide

## Context

The backend now caches the most expensive query (`fetchDuesPayments`) in Cloudflare KV with automatic invalidation on payment/student mutations. The frontend should complement this by avoiding redundant network calls.

## Current Problem

These endpoints are called excessively (360+ times in D1 stats):
- `GET /api/reports/defaulters`
- `GET /api/reports/dues-by-class`
- `GET /api/stats/dashboard`

Most calls are redundant — the same user navigating between pages triggers re-fetches for data that hasn't changed.

## Recommended Approach: React Query with `staleTime` + Optimistic Invalidation

### 1. Set `staleTime` on expensive queries

Don't refetch unless the data is actually stale:

```typescript
// Dashboard stats
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => api.get('/api/stats/dashboard'),
  staleTime: 5 * 60 * 1000, // 5 min — won't refetch if fresh
});

// Defaulters report
const { data: defaulters } = useQuery({
  queryKey: ['defaulters', asOfDate],
  queryFn: () => api.get(`/api/reports/defaulters?asOfDate=${asOfDate}`),
  staleTime: 5 * 60 * 1000,
});

// Dues by class
const { data: classDues } = useQuery({
  queryKey: ['dues-by-class', asOfDate],
  queryFn: () => api.get(`/api/reports/dues-by-class?asOfDate=${asOfDate}`),
  staleTime: 5 * 60 * 1000,
});
```

### 2. Invalidate related queries after mutations

When a payment is created/updated/deleted, invalidate the cached queries so they refetch on next access:

```typescript
const createPayment = useMutation({
  mutationFn: (payment) => api.post('/api/payments', payment),
  onSuccess: () => {
    // Invalidate all dues-related queries
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['defaulters'] });
    queryClient.invalidateQueries({ queryKey: ['dues-by-class'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  },
});

const deletePayment = useMutation({
  mutationFn: (id) => api.delete(`/api/payments/${id}`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['defaulters'] });
    queryClient.invalidateQueries({ queryKey: ['dues-by-class'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  },
});
```

### 3. Optional: Optimistic updates for payments list

For the payments list itself, you can optimistically add/remove the payment without waiting for a refetch:

```typescript
const createPayment = useMutation({
  mutationFn: (payment) => api.post('/api/payments', payment),
  onSuccess: (response) => {
    // Optimistically add the new payment to the list cache
    queryClient.setQueryData(['payments'], (old) => {
      if (!old) return old;
      return {
        ...old,
        result: [response.result, ...old.result],
      };
    });

    // Still invalidate reports (they need server-side recalculation)
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['defaulters'] });
    queryClient.invalidateQueries({ queryKey: ['dues-by-class'] });
  },
});
```

### 4. Helper: centralize invalidation

Create a helper to avoid repeating the same invalidation calls:

```typescript
function invalidateDuesQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  queryClient.invalidateQueries({ queryKey: ['defaulters'] });
  queryClient.invalidateQueries({ queryKey: ['dues-by-class'] });
}

// Usage in mutations:
onSuccess: () => {
  invalidateDuesQueries(queryClient);
  queryClient.invalidateQueries({ queryKey: ['payments'] });
},
```

## Summary

| Layer | Cache Duration | Invalidation |
|-------|---------------|--------------|
| **Frontend (React Query)** | 5 min `staleTime` | `invalidateQueries` on mutation success |
| **Backend (Cloudflare KV)** | 10 hr TTL (safety net) | Immediate on payment create/update/delete, student status change |
| **Database (D1)** | None | Source of truth |

This means:
- Navigating between pages = **zero network calls** (React Query cache hit)
- Creating a payment = **one refetch** per query (React Query invalidation triggers refetch, backend KV is also invalidated so it queries D1 fresh)
- Worst case = **5 min stale** on frontend if somehow invalidation doesn't fire
