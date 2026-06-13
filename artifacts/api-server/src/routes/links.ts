import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { projectLinksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/projects/:projectId/links
router.get("/projects/:projectId/links", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const rows = await db.select({ link: projectLinksTable, addedByName: usersTable.name })
    .from(projectLinksTable)
    .leftJoin(usersTable, eq(projectLinksTable.addedBy, usersTable.id))
    .where(eq(projectLinksTable.projectId, projectId));
  res.json(rows.map(({ link, addedByName }) => ({ ...link, addedByName })));
});

// POST /api/projects/:projectId/links
router.post("/projects/:projectId/links", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const user = (req as any).dbUser;
  const { title, url } = req.body as { title: string; url: string };
  const [link] = await db.insert(projectLinksTable).values({ projectId, title, url, addedBy: user.id }).returning();
  res.status(201).json(link);
});

// DELETE /api/projects/:projectId/links/:id
router.delete("/projects/:projectId/links/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(projectLinksTable).where(eq(projectLinksTable.id, id));
  res.status(204).end();
});

export default router;
