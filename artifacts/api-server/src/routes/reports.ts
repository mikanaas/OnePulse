import { Router } from "express";
import ExcelJS from "exceljs";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import {
  projectsTable,
  effectEntriesTable,
  costEntriesTable,
  tasksTable,
  usersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/reports/excel
router.get("/reports/excel", requireAuth, async (_req, res) => {
  const projects = await db
    .select({ project: projectsTable, ownerName: usersTable.name })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id));

  const effects = await db.select().from(effectEntriesTable);
  const costs = await db.select().from(costEntriesTable);
  const tasks = await db.select().from(tasksTable);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OneCo";
  workbook.created = new Date();

  // Prosjekter sheet
  const projSheet = workbook.addWorksheet("Prosjekter");
  projSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Navn", key: "name", width: 30 },
    { header: "Status", key: "status", width: 15 },
    { header: "Enhet", key: "businessUnit", width: 20 },
    { header: "Eier", key: "ownerName", width: 25 },
    { header: "Startdato", key: "startDate", width: 14 },
    { header: "Planlagt slutt", key: "plannedEndDate", width: 16 },
    { header: "Mål besparelse (kr)", key: "goalSavingsValue", width: 22 },
  ];
  for (const { project, ownerName } of projects) {
    projSheet.addRow({ ...project, ownerName });
  }

  // Effekter sheet
  const effSheet = workbook.addWorksheet("Effekter");
  effSheet.columns = [
    { header: "Prosjekt ID", key: "projectId", width: 12 },
    { header: "Dato", key: "date", width: 12 },
    { header: "Beskrivelse", key: "description", width: 35 },
    { header: "Verdi", key: "value", width: 14 },
    { header: "Enhet", key: "unit", width: 10 },
    { header: "Type", key: "type", width: 18 },
    { header: "Sikkerhetsnivå", key: "confidenceLevel", width: 16 },
  ];
  for (const e of effects) effSheet.addRow(e);

  // Kostnader sheet
  const costSheet = workbook.addWorksheet("Kostnader");
  costSheet.columns = [
    { header: "Prosjekt ID", key: "projectId", width: 12 },
    { header: "Dato", key: "date", width: 12 },
    { header: "Beskrivelse", key: "description", width: 35 },
    { header: "Verdi (kr)", key: "value", width: 14 },
  ];
  for (const c of costs) costSheet.addRow(c);

  // Oppgaver sheet
  const taskSheet = workbook.addWorksheet("Oppgaver");
  taskSheet.columns = [
    { header: "Prosjekt ID", key: "projectId", width: 12 },
    { header: "Tittel", key: "title", width: 35 },
    { header: "Status", key: "status", width: 15 },
    { header: "Prioritet", key: "priority", width: 12 },
    { header: "Forfallsdato", key: "dueDate", width: 14 },
  ];
  for (const t of tasks) taskSheet.addRow(t);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="oneco-rapport-${new Date().toISOString().slice(0,10)}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/reports/projects/:projectId/pdf
router.get("/reports/projects/:projectId/pdf", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const [row] = await db
    .select({ project: projectsTable, ownerName: usersTable.name })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(projectsTable.id, projectId));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const effects = await db.select().from(effectEntriesTable).where(eq(effectEntriesTable.projectId, projectId));
  const costs = await db.select().from(costEntriesTable).where(eq(costEntriesTable.projectId, projectId));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  const totalSavings = effects.reduce((s, e) => s + Number(e.value), 0);
  const totalCosts = costs.reduce((s, c) => s + Number(c.value), 0);

  // Build HTML for simple PDF
  const html = `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><title>${row.project.name}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}h1{color:#4A1F55}h2{color:#4A1F55;font-size:14px;margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#4A1F55;color:white;padding:6px 10px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #eee}.stat{display:inline-block;margin-right:32px;margin-bottom:8px}</style>
</head>
<body>
<h1>${row.project.name}</h1>
<p><strong>Status:</strong> ${row.project.status} &nbsp; <strong>Eier:</strong> ${row.ownerName ?? "-"} &nbsp; <strong>Enhet:</strong> ${row.project.businessUnit ?? "-"}</p>
${row.project.description ? `<p>${row.project.description}</p>` : ""}
<div><span class="stat"><strong>Realisert besparelse:</strong> ${totalSavings.toLocaleString("nb-NO")} kr</span><span class="stat"><strong>Totale kostnader:</strong> ${totalCosts.toLocaleString("nb-NO")} kr</span><span class="stat"><strong>Oppgaver:</strong> ${tasks.filter((t) => t.status === "fullfort").length}/${tasks.length} fullfort</span></div>
${effects.length > 0 ? `<h2>Effekter / Besparelser</h2><table><tr><th>Dato</th><th>Beskrivelse</th><th>Verdi</th><th>Enhet</th><th>Type</th></tr>${effects.map((e) => `<tr><td>${e.date}</td><td>${e.description}</td><td>${Number(e.value).toLocaleString("nb-NO")}</td><td>${e.unit}</td><td>${e.type}</td></tr>`).join("")}</table>` : ""}
${costs.length > 0 ? `<h2>Kostnader</h2><table><tr><th>Dato</th><th>Beskrivelse</th><th>Verdi (kr)</th></tr>${costs.map((c) => `<tr><td>${c.date}</td><td>${c.description}</td><td>${Number(c.value).toLocaleString("nb-NO")}</td></tr>`).join("")}</table>` : ""}
${tasks.length > 0 ? `<h2>Oppgaver</h2><table><tr><th>Tittel</th><th>Status</th><th>Prioritet</th><th>Forfallsdato</th></tr>${tasks.map((t) => `<tr><td>${t.title}</td><td>${t.status}</td><td>${t.priority}</td><td>${t.dueDate ?? "-"}</td></tr>`).join("")}</table>` : ""}
<p style="margin-top:40px;font-size:11px;color:#888">Generert: ${new Date().toLocaleString("nb-NO")} av OneCo</p>
</body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${row.project.name.replace(/[^a-zA-Z0-9]/g, "_")}-rapport.html"`);
  res.send(html);
});

export default router;
