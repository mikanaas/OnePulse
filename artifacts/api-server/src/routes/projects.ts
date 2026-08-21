import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { projectsTable, projectMembersTable, usersTable, tasksTable, effectEntriesTable, costEntriesTable } from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";

const router = Router();

// GET /api/projects
router.get("/projects", requireAuth, async (req, res) => {
  const { status, businessUnit, search } = req.query as { status?: string; businessUnit?: string; search?: string };
  const conditions: any[] = [];
  if (status) conditions.push(eq(projectsTable.status, status));
  if (businessUnit) conditions.push(eq(projectsTable.businessUnit, businessUnit));
  if (search) conditions.push(or(
    ilike(projectsTable.name, `%${search}%`),
    ilike(projectsTable.businessUnit, `%${search}%`),
    ilike(projectsTable.description, `%${search}%`),
    ilike(usersTable.name, `%${search}%`),
  ));

  const rows = await db
    .select({
      project: projectsTable,
      ownerName: usersTable.name,
    })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined);

  const memberCounts = await db
    .select({ projectId: projectMembersTable.projectId, count: sql<number>`count(*)::int` })
    .from(projectMembersTable)
    .groupBy(projectMembersTable.projectId);
  const memberMap = new Map(memberCounts.map((m) => [m.projectId, m.count]));

  const taskCounts = await db
    .select({
      projectId: tasksTable.projectId,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${tasksTable.status} = 'fullfort')::int`,
    })
    .from(tasksTable)
    .groupBy(tasksTable.projectId);
  const taskMap = new Map(taskCounts.map((t) => [t.projectId, t]));

  const effectTotals = await db
    .select({ projectId: effectEntriesTable.projectId, total: sql<number>`coalesce(sum(${effectEntriesTable.value}), 0)` })
    .from(effectEntriesTable)
    .groupBy(effectEntriesTable.projectId);
  const effectMap = new Map(effectTotals.map((e) => [e.projectId, Number(e.total)]));

  const costTotals = await db
    .select({ projectId: costEntriesTable.projectId, total: sql<number>`coalesce(sum(${costEntriesTable.value}), 0)` })
    .from(costEntriesTable)
    .groupBy(costEntriesTable.projectId);
  const costMap = new Map(costTotals.map((c) => [c.projectId, Number(c.total)]));

  res.json(rows.map(({ project, ownerName }) => ({
    ...project,
    ownerName: ownerName ?? null,
    memberCount: memberMap.get(project.id) ?? 0,
    taskCount: taskMap.get(project.id)?.total ?? 0,
    completedTaskCount: taskMap.get(project.id)?.completed ?? 0,
    totalSavings: effectMap.get(project.id) ?? 0,
    totalCosts: costMap.get(project.id) ?? 0,
  })));
});

// POST /api/projects
router.post("/projects", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const body = req.body as any;
  const [project] = await db.insert(projectsTable).values({
    name: body.name,
    description: body.description,
    businessUnit: body.businessUnit,
    status: body.status ?? "ide",
    ownerId: body.ownerId ?? user.id,
    startDate: body.startDate,
    plannedEndDate: body.plannedEndDate,
    goalText: body.goalText,
    goalSavingsValue: body.goalSavingsValue,
    goalSavingsUnit: body.goalSavingsUnit,
    goalDate: body.goalDate,
    estimatedHours: body.estimatedHours,
  }).returning();
  // Auto-add creator as prosjektleder
  await db.insert(projectMembersTable).values({ projectId: project.id, userId: user.id, role: "prosjektleder" }).onConflictDoNothing();
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get("/projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select({ project: projectsTable, ownerName: usersTable.name })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(projectsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const [[effectTotal], [costTotal]] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${effectEntriesTable.value}), 0)` })
      .from(effectEntriesTable)
      .where(eq(effectEntriesTable.projectId, id)),
    db.select({ total: sql<number>`coalesce(sum(${costEntriesTable.value}), 0)` })
      .from(costEntriesTable)
      .where(eq(costEntriesTable.projectId, id)),
  ]);

  res.json({
    ...row.project,
    ownerName: row.ownerName,
    totalSavings: Number(effectTotal?.total ?? 0),
    totalCosts: Number(costTotal?.total ?? 0),
  });
});

// PATCH /api/projects/:id
router.patch("/projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as any;
  const updateData: any = {};
  for (const key of ["name","description","businessUnit","status","ownerId","startDate","plannedEndDate","goalText","goalSavingsValue","goalSavingsUnit","goalDate","estimatedHours"]) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }
  const [project] = await db.update(projectsTable).set(updateData).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(project);
});

// DELETE /api/projects/:id
router.delete("/projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).end();
});

// GET /api/projects/:id/members
router.get("/projects/:id/members", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db
    .select({ member: projectMembersTable, userName: usersTable.name, userEmail: usersTable.email })
    .from(projectMembersTable)
    .leftJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, id));
  res.json(rows.map(({ member, userName, userEmail }) => ({ ...member, userName, userEmail })));
});

// POST /api/projects/:id/members
router.post("/projects/:id/members", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { userId, role } = req.body as { userId: number; role?: string };
  const [member] = await db.insert(projectMembersTable)
    .values({ projectId: id, userId, role: role ?? "medlem" })
    .returning();
  res.status(201).json(member);
});

// DELETE /api/projects/:id/members/:userId
router.delete("/projects/:id/members/:userId", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  const userId = Number(req.params.userId);
  await db.delete(projectMembersTable).where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)));
  res.status(204).end();
});

export default router;
