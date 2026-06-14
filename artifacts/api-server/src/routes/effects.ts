import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { effectEntriesTable, costEntriesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/projects/:projectId/effects
router.get("/projects/:projectId/effects", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const rows = await db.select({ effect: effectEntriesTable, registeredByName: usersTable.name })
    .from(effectEntriesTable)
    .leftJoin(usersTable, eq(effectEntriesTable.registeredBy, usersTable.id))
    .where(eq(effectEntriesTable.projectId, projectId));
  res.json(rows.map(({ effect, registeredByName }) => ({ ...effect, registeredByName })));
});

// POST /api/projects/:projectId/effects
router.post("/projects/:projectId/effects", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const user = (req as any).dbUser;
  const body = req.body as any;
  const [effect] = await db.insert(effectEntriesTable).values({
    projectId,
    date: body.date,
    description: body.description,
    value: body.value,
    unit: body.unit ?? "kr",
    type: body.type ?? "engangs",
    confidenceLevel: body.confidenceLevel ?? "middels",
    registeredBy: user.id,
  }).returning();
  res.status(201).json(effect);
});

// PATCH /api/projects/:projectId/effects/:id
router.patch("/projects/:projectId/effects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as any;
  const updateData: any = {};
  for (const key of ["date","description","value","unit","type","confidenceLevel"]) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }
  const [effect] = await db.update(effectEntriesTable).set(updateData).where(eq(effectEntriesTable.id, id)).returning();
  if (!effect) { res.status(404).json({ error: "Not found" }); return; }
  res.json(effect);
});

// DELETE /api/projects/:projectId/effects/:id
router.delete("/projects/:projectId/effects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(effectEntriesTable).where(eq(effectEntriesTable.id, id));
  res.status(204).end();
});

// GET /api/projects/:projectId/costs
router.get("/projects/:projectId/costs", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const rows = await db.select({ cost: costEntriesTable, registeredByName: usersTable.name })
    .from(costEntriesTable)
    .leftJoin(usersTable, eq(costEntriesTable.registeredBy, usersTable.id))
    .where(eq(costEntriesTable.projectId, projectId));
  res.json(rows.map(({ cost, registeredByName }) => ({ ...cost, registeredByName })));
});

// POST /api/projects/:projectId/costs
router.post("/projects/:projectId/costs", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const user = (req as any).dbUser;
  const body = req.body as any;
  const [cost] = await db.insert(costEntriesTable).values({
    projectId,
    date: body.date,
    description: body.description,
    value: body.value,
    registeredBy: user.id,
  }).returning();
  res.status(201).json(cost);
});

// PATCH /api/projects/:projectId/costs/:id
router.patch("/projects/:projectId/costs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as any;
  const updateData: any = {};
  for (const key of ["date","description","value"]) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }
  const [cost] = await db.update(costEntriesTable).set(updateData).where(eq(costEntriesTable.id, id)).returning();
  if (!cost) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cost);
});

// DELETE /api/projects/:projectId/costs/:id
router.delete("/projects/:projectId/costs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(costEntriesTable).where(eq(costEntriesTable.id, id));
  res.status(204).end();
});

export default router;
