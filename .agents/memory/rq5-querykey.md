---
name: React Query v5 queryKey required
description: UseQueryOptions in React Query v5 requires an explicit queryKey field — cannot be omitted.
---

# React Query v5 queryKey Required

**Rule:** When passing `{ query: { enabled: !!id } }` options to Orval-generated hooks, always include `queryKey`.

**Why:** React Query v5's `UseQueryOptions` type requires `queryKey` as a non-optional field. Omitting it causes TS2741 compile errors even though RQ can infer the key at runtime.

**How to apply:**
```tsx
// WRONG — TS2741
useGetProject(id, { query: { enabled: !!id } })

// CORRECT
useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } })
```

QueryKey helpers follow the naming pattern `get<HookName>QueryKey(...)`.
