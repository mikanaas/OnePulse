import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { dmaicTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/projects/:projectId/dmaic
router.get("/projects/:projectId/dmaic", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const [row] = await db.select().from(dmaicTable).where(eq(dmaicTable.projectId, projectId));

  if (!row) {
    const [created] = await db.insert(dmaicTable).values({
      projectId,
      defineData: {},
      measureData: [],
      analyzeData: {},
      improveData: {},
      controlData: [],
    }).returning();
    res.json(created);
    return;
  }

  res.json(row);
});

// PUT /api/projects/:projectId/dmaic
router.put("/projects/:projectId/dmaic", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const body = req.body as any;

  const updateData: any = {};
  if (body.defineData !== undefined)  updateData.defineData  = body.defineData;
  if (body.measureData !== undefined) updateData.measureData = body.measureData;
  if (body.analyzeData !== undefined) updateData.analyzeData = body.analyzeData;
  if (body.improveData !== undefined) updateData.improveData = body.improveData;
  if (body.controlData !== undefined) updateData.controlData = body.controlData;

  const [existing] = await db.select().from(dmaicTable).where(eq(dmaicTable.projectId, projectId));

  if (existing) {
    const [updated] = await db.update(dmaicTable).set(updateData).where(eq(dmaicTable.projectId, projectId)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(dmaicTable).values({ projectId, ...updateData }).returning();
    res.json(created);
  }
});

export default router;
