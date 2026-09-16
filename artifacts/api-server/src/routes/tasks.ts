import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { activeProjectsCondition } from "../lib/projectArchive";
import { tasksTable, taskCommentsTable, usersTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/projects/:projectId/tasks
router.get("/projects/:projectId/tasks", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const { status, assigneeId, priority } = req.query as { status?: string; assigneeId?: string; priority?: string };
  const conditions: any[] = [eq(tasksTable.projectId, projectId)];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, Number(assigneeId)));
  if (priority) conditions.push(eq(tasksTable.priority, priority));

  const rows = await db.select({ task: tasksTable, assigneeName: usersTable.name })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(and(...conditions));
  res.json(rows.map(({ task, assigneeName }) => ({ ...task, assigneeName })));
});

// POST /api/projects/:projectId/tasks
router.post("/projects/:projectId/tasks", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const body = req.body as any;
  const [task] = await db.insert(tasksTable).values({
    projectId,
    title: body.title,
    description: body.description,
    assigneeId: body.assigneeId,
    status: body.status ?? "ikke_startet",
    priority: body.priority ?? "middels",
    dueDate: body.dueDate,
  }).returning();
  res.status(201).json(task);
});

// GET /api/projects/:projectId/tasks/:id
router.get("/projects/:projectId/tasks/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const projectId = Number(req.params.projectId);
  const [row] = await db.select({ task: tasksTable, assigneeName: usersTable.name })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(and(eq(tasksTable.id, id), eq(tasksTable.projectId, projectId)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row.task, assigneeName: row.assigneeName });
});

// PATCH /api/projects/:projectId/tasks/:id
router.patch("/projects/:projectId/tasks/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as any;
  const updateData: any = {};
  for (const key of ["title","description","assigneeId","status","priority","dueDate"]) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }
  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(task);
});

// DELETE /api/projects/:projectId/tasks/:id
router.delete("/projects/:projectId/tasks/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).end();
});

// GET /api/tasks/mine
router.get("/tasks/mine", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const { status } = req.query as { status?: string };
  const conditions: any[] = [
    eq(tasksTable.assigneeId, user.id),
    activeProjectsCondition(),
  ];
  if (status) conditions.push(eq(tasksTable.status, status));
  const rows = await db
    .select({ task: tasksTable, projectName: projectsTable.name })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(and(...conditions));
  res.json(rows.map(({ task, projectName }) => ({ ...task, projectName: projectName ?? null })));
});

// GET /api/projects/:projectId/tasks/:taskId/comments
router.get("/projects/:projectId/tasks/:taskId/comments", requireAuth, async (req, res) => {
  const taskId = Number(req.params.taskId);
  const rows = await db.select({ comment: taskCommentsTable, userName: usersTable.name })
    .from(taskCommentsTable)
    .leftJoin(usersTable, eq(taskCommentsTable.userId, usersTable.id))
    .where(eq(taskCommentsTable.taskId, taskId));
  res.json(rows.map(({ comment, userName }) => ({ ...comment, userName })));
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post("/projects/:projectId/tasks/:taskId/comments", requireAuth, async (req, res) => {
  const taskId = Number(req.params.taskId);
  const user = (req as any).dbUser;
  const { text } = req.body as { text: string };
  const [comment] = await db.insert(taskCommentsTable).values({ taskId, userId: user.id, text }).returning();
  res.status(201).json(comment);
});

export default router;
