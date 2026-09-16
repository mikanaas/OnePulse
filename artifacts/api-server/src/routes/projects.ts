import { Router } from "express";
import ExcelJS from "exceljs";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import {
  activeProjectListCondition,
  archivedProjectsCondition,
  operationalProjectsCondition,
} from "../lib/projectArchive";
import { projectsTable, projectGovernanceTable, projectMembersTable, usersTable, tasksTable, effectEntriesTable, costEntriesTable } from "@workspace/db";
import { eq, and, or, ilike, sql, isNull } from "drizzle-orm";

const router = Router();

const registrationGovernanceFields = [
  "projectOwner", "techOwner", "contactEmail", "platformTools", "systemIntegrations",
  "integrationDataFlow", "projectDependencies", "dataTypes", "dataStorage", "dataGeography",
  "dataRetention", "personalData", "sensitiveData", "aiVendor", "humanInLoop", "riskClassification",
] as const;
const registrationStatuses = new Set(["pagaende", "pause", "fullfort", "i_drift"]);
const yesNoUnknown = new Set(["ja", "nei", "ukjent"]);
const riskLevels = new Set(["lav", "middels", "høy"]);

function registrationError(body: any): string | null {
  if (!body.name?.trim() || !body.description?.trim() || !body.businessUnit?.trim() || !body.projectOwner?.trim()) {
    return "Name, description, business unit and project owner are required";
  }
  if (body.status && !registrationStatuses.has(body.status)) return "Invalid project status";
  if (body.personalData && !yesNoUnknown.has(body.personalData)) return "Invalid personal data value";
  if (body.sensitiveData && !yesNoUnknown.has(body.sensitiveData)) return "Invalid sensitive data value";
  if (body.riskClassification && !riskLevels.has(body.riskClassification)) return "Invalid risk classification";
  for (const field of ["startDate", "plannedEndDate"]) {
    if (body[field] && !/^\d{4}-\d{2}-\d{2}$/.test(body[field])) return `Invalid ${field}`;
  }
  return null;
}

async function createRegisteredProject(executor: any, body: any, fallbackOwnerId: number) {
  const [project] = await executor.insert(projectsTable).values({
    name: body.name.trim(),
    description: body.description.trim(),
    businessUnit: body.businessUnit.trim(),
    status: body.status ?? "pagaende",
    ownerId: body.ownerId ?? fallbackOwnerId,
    startDate: body.startDate || null,
    plannedEndDate: body.plannedEndDate || null,
  }).returning();

  const ownerId = body.ownerId ?? fallbackOwnerId;
  const members = [{ projectId: project.id, userId: ownerId, role: "prosjektleder" }];
  if (ownerId !== fallbackOwnerId) {
    members.push({ projectId: project.id, userId: fallbackOwnerId, role: "deltaker" });
  }
  await executor.insert(projectMembersTable).values(members).onConflictDoNothing();

  const governance: Record<string, string | null> = {};
  for (const field of registrationGovernanceFields) governance[field] = body[field]?.trim?.() || null;
  await executor.insert(projectGovernanceTable).values({
    projectId: project.id,
    ...governance,
    problemDescription: body.description.trim(),
    governanceStatus: "under_vurdering",
  });
  return project;
}

// GET /api/projects
router.get("/projects", requireAuth, async (req, res) => {
  const { status, businessUnit, search, archived } = req.query as {
    status?: string;
    businessUnit?: string;
    search?: string;
    archived?: string;
  };
  const conditions: any[] = [
    archived === "true"
      ? archivedProjectsCondition()
      : status === "i_drift"
        ? operationalProjectsCondition()
        : activeProjectListCondition(),
  ];
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
    archivedAt: body.status === "avsluttet" ? new Date() : null,
  }).returning();
  // Auto-add creator as prosjektleder
  await db.insert(projectMembersTable).values({ projectId: project.id, userId: user.id, role: "prosjektleder" }).onConflictDoNothing();
  res.status(201).json(project);
});

// POST /api/projects/register-existing
router.post("/projects/register-existing", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const body = req.body as any;
  const validationError = registrationError(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  if (body.ownerId != null) {
    const [owner] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, Number(body.ownerId)), eq(usersTable.active, true))).limit(1);
    if (!owner) { res.status(400).json({ error: "Selected owner is not an active user" }); return; }
  }
  const project = await db.transaction((tx) => createRegisteredProject(tx, body, user.id));
  res.status(201).json(project);
});

// GET /api/projects/existing-import-template.xlsx
router.get("/projects/existing-import-template.xlsx", requireAuth, async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("AI-prosjekter");
  const headers = [
    "Prosjektnavn", "Beskrivelse", "Forretningsområde", "Ansvarlig", "Ansvarlig e-post",
    "Teknisk ansvarlig", "Status", "Startdato", "Planlagt sluttdato", "Plattformer/verktøy",
    "Integrasjoner", "Dataflyt", "Datatyper", "Datalagring", "Datalokasjon", "Oppbevaringstid",
    "Personopplysninger", "Sensitive data", "AI-leverandør", "Menneskelig kontroll", "Risikoklasse",
  ];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => { column.width = 24; });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  res
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .setHeader("Content-Disposition", 'attachment; filename="OnePulse-AI-prosjekter-mal.xlsx"')
    .send(Buffer.from(buffer));
});

// POST /api/projects/import-existing
router.post("/projects/import-existing", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const fileBase64 = req.body?.fileBase64;
  if (typeof fileBase64 !== "string" || !fileBase64) {
    res.status(400).json({ error: "Excel file is required" });
    return;
  }
  const fileBuffer = Buffer.from(fileBase64, "base64");
  if (fileBuffer.byteLength > 5 * 1024 * 1024) {
    res.status(413).json({ error: "The Excel file must be 5 MB or smaller" });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer as any);
  } catch {
    res.status(400).json({ error: "The Excel file could not be read" });
    return;
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) { res.status(400).json({ error: "The workbook is empty" }); return; }
  if (sheet.actualRowCount > 501 || sheet.actualColumnCount > 50) {
    res.status(400).json({ error: "The workbook can contain at most 500 projects and 50 columns" });
    return;
  }

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => headerMap.set(cell.text.trim().toLowerCase(), column));
  const value = (row: ExcelJS.Row, header: string) => {
    const column = headerMap.get(header.toLowerCase());
    return column ? row.getCell(column).text.trim() : "";
  };
  const dateValue = (row: ExcelJS.Row, header: string) => {
    const column = headerMap.get(header.toLowerCase());
    if (!column) return "";
    const raw = row.getCell(column).value;
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    return row.getCell(column).text.trim();
  };
  const normalizeChoice = (input: string) => {
    const normalized = input.trim().toLowerCase();
    if (["ja", "nei", "ukjent"].includes(normalized)) return normalized;
    return "ukjent";
  };
  const statusMap: Record<string, string> = {
    "pågående": "pagaende", pagaende: "pagaende", pause: "pause",
    "fullført": "fullfort", fullfort: "fullfort", "i drift": "i_drift", i_drift: "i_drift",
  };
  const riskMap: Record<string, string> = { lav: "lav", middels: "middels", høy: "høy", hoy: "høy" };
  const users = await db.select().from(usersTable).where(eq(usersTable.active, true));
  const userByEmail = new Map(users.map((entry) => [entry.email.toLowerCase(), entry.id]));
  const existing = await db.select({ name: projectsTable.name }).from(projectsTable);
  const existingNames = new Set(existing.map((entry) => entry.name.trim().toLowerCase()));
  const errors: Array<{ row: number; message: string }> = [];
  let created = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = value(row, "Prosjektnavn");
    if (!name && row.cellCount === 0) continue;
    const description = value(row, "Beskrivelse");
    const businessUnit = value(row, "Forretningsområde");
    const projectOwner = value(row, "Ansvarlig");
    if (!name || !description || !businessUnit || !projectOwner) {
      errors.push({ row: rowNumber, message: "Prosjektnavn, beskrivelse, forretningsområde og ansvarlig må fylles ut." });
      continue;
    }
    if (existingNames.has(name.toLowerCase())) {
      errors.push({ row: rowNumber, message: "Et prosjekt med samme navn finnes allerede." });
      continue;
    }
    const ownerEmail = value(row, "Ansvarlig e-post").toLowerCase();
    if (ownerEmail && !userByEmail.has(ownerEmail)) {
      errors.push({ row: rowNumber, message: "Ansvarlig e-post tilhører ikke en aktiv OnePulse-bruker." });
      continue;
    }
    const body = {
      name, description, businessUnit, projectOwner,
      ownerId: userByEmail.get(ownerEmail) ?? user.id,
      contactEmail: ownerEmail,
      techOwner: value(row, "Teknisk ansvarlig"),
      status: statusMap[value(row, "Status").toLowerCase()] ?? "pagaende",
      startDate: dateValue(row, "Startdato"),
      plannedEndDate: dateValue(row, "Planlagt sluttdato"),
      platformTools: value(row, "Plattformer/verktøy"),
      systemIntegrations: value(row, "Integrasjoner"),
      integrationDataFlow: value(row, "Dataflyt"),
      dataTypes: value(row, "Datatyper"),
      dataStorage: value(row, "Datalagring"),
      dataGeography: value(row, "Datalokasjon"),
      dataRetention: value(row, "Oppbevaringstid"),
      personalData: normalizeChoice(value(row, "Personopplysninger")),
      sensitiveData: normalizeChoice(value(row, "Sensitive data")),
      aiVendor: value(row, "AI-leverandør"),
      humanInLoop: value(row, "Menneskelig kontroll"),
      riskClassification: riskMap[value(row, "Risikoklasse").toLowerCase()] ?? null,
    };
    const rowValidationError = registrationError(body);
    if (rowValidationError) {
      errors.push({ row: rowNumber, message: "En eller flere verdier har ugyldig format." });
      continue;
    }
    try {
      await db.transaction((tx) => createRegisteredProject(tx, body, user.id));
      existingNames.add(name.toLowerCase());
      created += 1;
    } catch {
      errors.push({ row: rowNumber, message: "Prosjektet kunne ikke lagres." });
    }
  }
  res.json({ created, errors });
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
  if (body.status === "avsluttet") updateData.archivedAt = new Date();
  const [project] = await db.update(projectsTable).set(updateData).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(project);
});

// DELETE /api/projects/:id — archive without deleting related data
router.delete("/projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [project] = await db
    .update(projectsTable)
    .set({ status: "avsluttet", archivedAt: new Date() })
    .where(and(eq(projectsTable.id, id), isNull(projectsTable.archivedAt)))
    .returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

// POST /api/projects/:id — restore an archived project
router.post("/projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [project] = await db
    .update(projectsTable)
    .set({ status: "pagaende", archivedAt: null })
    .where(and(eq(projectsTable.id, id), archivedProjectsCondition()))
    .returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(project);
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
