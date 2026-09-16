---
name: CRUD parity for user records
description: Product rule for editable and deletable records in user-facing lists and logs.
---

**Rule:** When users can create a standalone persistent record in a visible list, table, or log, the same surface should normally let them edit and delete it. Permanent deletion must require explicit confirmation.

**Why:** The user requested a systematic approach after finding multiple create-only record types. Adding actions only when each missing case is reported leads to inconsistent workflows.

**How to apply:** Audit CRUD parity whenever adding or changing user-created records. Exclude read-only aggregates, transient AI helpers, and singleton project configuration where save/update is the intended interaction.