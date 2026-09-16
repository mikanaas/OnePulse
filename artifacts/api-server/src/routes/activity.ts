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

// PATCH /api/projects/:projectId/activity/:id
router.patch("/projects/:projectId/activity/:id", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const id = Number(req.params.id);
  const body = req.body as { type?: string; content?: string };
  const updateData: { type?: string; content?: string } = {};
  if (body.type !== undefined) updateData.type = body.type;
  if (body.content !== undefined) updateData.content = body.content;

  const [entry] = await db
    .update(activityLogTable)
    .set(updateData)
    .where(and(eq(activityLogTable.id, id), eq(activityLogTable.projectId, projectId)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.json(entry);
});

// DELETE /api/projects/:projectId/activity/:id
router.delete("/projects/:projectId/activity/:id", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const id = Number(req.params.id);
  const [entry] = await db
    .delete(activityLogTable)
    .where(and(eq(activityLogTable.id, id), eq(activityLogTable.projectId, projectId)))
    .returning({ id: activityLogTable.id });
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
