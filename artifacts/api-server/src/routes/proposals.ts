import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { proposalsTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

// GET /api/proposals
router.get("/proposals", requireAuth, async (req, res) => {
  const { status, effect, complexity } = req.query as Record<string, string | undefined>;

  const rows = await db
    .select({ proposal: proposalsTable, submittedByName: usersTable.name })
    .from(proposalsTable)
    .leftJoin(usersTable, eq(proposalsTable.submittedBy, usersTable.id));

  let results = rows.map(({ proposal, submittedByName }) => ({ ...proposal, submittedByName }));

  if (status) results = results.filter((r) => r.status === status);
  if (effect) results = results.filter((r) => r.effect === effect);
  if (complexity) results = results.filter((r) => r.complexity === complexity);

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(results);
});

// POST /api/proposals
router.post("/proposals", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const body = req.body as any;

  const [proposal] = await db.insert(proposalsTable).values({
    title: body.title,
    description: body.description,
    type: body.type ?? "problem",
    solutionDescription: body.solutionDescription ?? null,
    effect: body.effect ?? "liten",
    complexity: body.complexity ?? "krevende",
    status: "ny",
    submittedBy: user.id,
  }).returning();

  const row = await db
    .select({ proposal: proposalsTable, submittedByName: usersTable.name })
    .from(proposalsTable)
    .leftJoin(usersTable, eq(proposalsTable.submittedBy, usersTable.id))
    .where(eq(proposalsTable.id, proposal.id))
    .then((r) => r[0]);

  res.status(201).json({ ...row.proposal, submittedByName: row.submittedByName });
});

// PATCH /api/proposals/:id
router.patch("/proposals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as any;
  const updateData: any = {};

  for (const key of ["title", "description", "solutionDescription", "effect", "complexity", "status"]) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const [updated] = await db.update(proposalsTable).set(updateData).where(eq(proposalsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const row = await db
    .select({ proposal: proposalsTable, submittedByName: usersTable.name })
    .from(proposalsTable)
    .leftJoin(usersTable, eq(proposalsTable.submittedBy, usersTable.id))
    .where(eq(proposalsTable.id, id))
    .then((r) => r[0]);

  res.json({ ...row.proposal, submittedByName: row.submittedByName });
});

// DELETE /api/proposals/:id
router.delete("/proposals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(proposalsTable).where(eq(proposalsTable.id, id));
  res.status(204).end();
});

// POST /api/proposals/:id/convert
router.post("/proposals/:id/convert", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const user = (req as any).dbUser;
  const body = req.body as any;

  const [existing] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [project] = await db.insert(projectsTable).values({
    name: body.name,
    description: body.description ?? existing.description,
    businessUnit: body.businessUnit ?? null,
    status: "ide",
    ownerId: user.id,
    goalText: body.goalText ?? null,
  }).returning();

  await db.update(proposalsTable).set({
    status: "konvertert",
    convertedToProjectId: project.id,
  }).where(eq(proposalsTable.id, id));

  res.status(201).json({ projectId: project.id });
});

export default router;
