import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { activityLogTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/projects/:projectId/activity
router.get("/projects/:projectId/activity", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const { type } = req.query as { type?: string };
  const conditions: any[] = [eq(activityLogTable.projectId, projectId)];
  if (type) conditions.push(eq(activityLogTable.type, type));

  const rows = await db.select({ entry: activityLogTable, userName: usersTable.name })
    .from(activityLogTable)
    .leftJoin(usersTable, eq(activityLogTable.userId, usersTable.id))
    .where(and(...conditions));
  res.json(rows.map(({ entry, userName }) => ({ ...entry, userName })));
});

// POST /api/projects/:projectId/activity
router.post("/projects/:projectId/activity", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const user = (req as any).dbUser;
  const { type, content } = req.body as { type?: string; content: string };
  const [entry] = await db.insert(activityLogTable).values({
    projectId,
    userId: user.id,
    type: type ?? "kommentar",
    content,
  }).returning();
  res.status(201).json(entry);
});

export default router;
