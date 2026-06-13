import { Router } from "express";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/requireAuth";
import { auditLogTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/audit
router.get("/audit", requireAdmin, async (req, res) => {
  const { limit = "50", offset = "0" } = req.query as { limit?: string; offset?: string };
  const rows = await db
    .select({ log: auditLogTable, userName: usersTable.name })
    .from(auditLogTable)
    .leftJoin(usersTable, eq(auditLogTable.userId, usersTable.id))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));
  res.json(rows.map(({ log, userName }) => ({ ...log, userName })));
});

export default router;
