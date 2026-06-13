---
name: Orval hook argument patterns
description: Orval-generated hooks take positional numeric IDs as first arg; mutations require all path params explicitly.
---

# Orval Hook Argument Patterns

**Rule:** Query hooks take positional numeric IDs, not destructured objects. Mutation variables include all path params.

**Why:** Orval generates hooks from OpenAPI path parameters as positional arguments. Design subagents sometimes pass `{ projectId }` objects instead of plain numbers.

**How to apply:**

Query hooks — first arg is always the numeric path param:
```tsx
// WRONG
useListTasks({ projectId }, { query: ... })
useListEffects({ projectId }, { query: ... })

// CORRECT  
useListTasks(projectId, undefined, { query: ... })   // has params + options
useListEffects(projectId, { query: ... })             // no params arg
useListActivity(projectId, undefined, { query: ... }) // has params arg
useListCosts(projectId, { query: ... })               // no params arg
```

Mutations — all path params must be in the variables object:
```tsx
// WRONG
updateTask.mutate({ id: taskId, data: { status } })

// CORRECT
updateTask.mutate({ projectId, id: taskId, data: { status } })
```

Check exact signatures with:
```bash
grep -A 4 "^export function use<HookName>" lib/api-client-react/src/generated/api.ts
```
