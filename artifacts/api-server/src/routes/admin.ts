import { Router } from "express";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/requireAuth";
import {
  usersTable, projectsTable, projectMembersTable,
  tasksTable, effectEntriesTable, costEntriesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

// ─── Seed demo data ───────────────────────────────────────────────────────────
router.post("/admin/seed-demo", requireAdmin, async (req, res) => {
  // Check if demo data already exists
  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, "seed_admin1"))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Demodata er allerede lastet inn" });
    return;
  }

  // 1. Insert demo users
  const demoUsers = await db.insert(usersTable).values([
    { clerkId: "seed_admin1", name: "Kari Andersen", email: "kari@oneco.no", systemRole: "admin", active: true },
    { clerkId: "seed_user5", name: "Ingrid Holm",    email: "ingrid@oneco.no", systemRole: "user", active: true },
    { clerkId: "seed_user3", name: "Sofie Dahl",     email: "sofie@oneco.no",  systemRole: "user", active: true },
    { clerkId: "seed_user2", name: "Ole Martin Bakke", email: "ole@oneco.no", systemRole: "user", active: true },
    { clerkId: "seed_user4", name: "Erik Fjell",     email: "erik@oneco.no",   systemRole: "user", active: true },
  ]).returning();

  // Map old dev IDs → new prod IDs
  const u: Record<number, number> = {
    12: demoUsers[0].id, // Kari
    13: demoUsers[1].id, // Ingrid
    14: demoUsers[2].id, // Sofie
    15: demoUsers[3].id, // Ole
    16: demoUsers[4].id, // Erik
  };

  // 2. Insert projects
  const demoProjects = await db.insert(projectsTable).values([
    { name: "AI-drevet kundeservice chatbot", status: "pagaende", businessUnit: "OneCo Technologies", ownerId: u[12], description: "Implementere en AI-assistent for å håndtere vanlige kundehenvendelser automatisk, redusere ventetid og frigjøre kapasitet hos kundeserviceteamet.", goalText: "Redusere manuell håndtering av henvendelser med 40 %", goalSavingsValue: "1800000", goalSavingsUnit: "kr", startDate: "2025-01-15", plannedEndDate: "2025-09-30" },
    { name: "Automatisering av fakturabehandling", status: "fullfort", businessUnit: "OneCo Elektro", ownerId: u[15], description: "Innføre RPA og OCR-løsning for automatisk innlesing og godkjenning av leverandørfakturaer. Målet er å eliminere manuell dataregistrering.", goalText: "Spare 2 500 timer per år på fakturahåndtering", goalSavingsValue: "2500", goalSavingsUnit: "timer", startDate: "2024-03-01", plannedEndDate: "2024-11-30" },
    { name: "Digitalt onboarding-system for nyansatte", status: "pagaende", businessUnit: "OneCo Networks", ownerId: u[14], description: "Erstatte papirbasert onboarding med en digital plattform som automatisk sender kontrakter, opplæringsmoduler og utstyrslister til nye medarbeidere.", goalText: "Kutte onboarding-tid fra 3 dager til 4 timer per ansatt", goalSavingsValue: "650000", goalSavingsUnit: "kr", startDate: "2025-02-01", plannedEndDate: "2025-08-31" },
    { name: "Prediktivt vedlikehold for produksjonslinjer", status: "ide", businessUnit: "OneCo Infra", ownerId: u[16], description: "Bruke IoT-sensorer og maskinlæring for å forutsi og forebygge driftstopp på produksjonsutstyret. Redusere uplanlagte stopp med minst 60 %.", goalText: "Redusere nedetid og vedlikeholdskostnader", goalSavingsValue: "4200000", goalSavingsUnit: "kr", startDate: "2025-09-01", plannedEndDate: "2026-06-30" },
    { name: "Selvbetjeningsportal for leverandører", status: "pause", businessUnit: "OneCo Sverige", ownerId: u[12], description: "Gi leverandørene tilgang til en portal der de selv kan registrere ordrebekreftelser, laste opp fakturaer og følge betalingsstatus – uten å kontakte innkjøpsavdelingen.", goalText: "Redusere innkjøpsadministrasjon med 30 %", goalSavingsValue: "920000", goalSavingsUnit: "kr", startDate: "2024-10-01", plannedEndDate: "2025-06-30" },
    { name: "Intelligent dokumenthåndtering med AI", status: "pagaende", businessUnit: "OneCo Technologies", ownerId: u[13], description: "Implementere AI-drevet søk, klassifisering og tagging av interne dokumenter for å gjøre det enklere å finne riktig informasjon raskt.", goalText: "Redusere tid brukt på dokumentsøk med 50 %", goalSavingsValue: "1100000", goalSavingsUnit: "kr", startDate: "2025-03-01", plannedEndDate: "2025-12-31" },
    { name: "Automatisk rapportering til styret", status: "fullfort", businessUnit: "OneCo Elektro", ownerId: u[15], description: "Koble til ERP og BI-systemer for å generere styrerapporten automatisk hver måned. Eliminere manuell datauthenting og PowerPoint-arbeid.", goalText: "Spare 40 timer per måned på rapportproduksjon", goalSavingsValue: "480", goalSavingsUnit: "timer", startDate: "2024-06-01", plannedEndDate: "2024-12-15" },
    { name: "Digital timeregistrering og ressursplanlegging", status: "pagaende", businessUnit: "OneCo Networks", ownerId: u[14], description: "Modernisere timeregistreringssystemet med mobilvennlig app og automatisk integrasjon mot prosjektplanlegging og lønn.", goalText: "Redusere administrasjonstid og feil i lønn", goalSavingsValue: "380000", goalSavingsUnit: "kr", startDate: "2025-01-01", plannedEndDate: "2025-07-31" },
    { name: "AI-analyse av kundefeedback", status: "avsluttet", businessUnit: "OneCo Sverige", ownerId: u[12], description: "Bruke naturlig språkprosessering for å analysere kundeundersøkelser og støttehenvendelser automatisk, og identifisere trender og forbedringsområder i sanntid.", goalText: "Automatisere analyseprosessen og øke innsiktskvalitet", goalSavingsValue: "600000", goalSavingsUnit: "kr", startDate: "2024-01-01", plannedEndDate: "2024-07-31" },
    { name: "Energioptimalisering med smart bygg-teknologi", status: "ide", businessUnit: "OneCo Infra", ownerId: u[16], description: "Installere smarte sensorer og bygningsautomasjon for å optimalisere energiforbruket i kontorbyggene. Dynamisk styring av lys, varme og ventilasjon.", goalText: "Redusere energikostnader med 35 %", goalSavingsValue: "2800000", goalSavingsUnit: "kr", startDate: "2026-01-01", plannedEndDate: "2026-12-31" },
  ]).returning();

  // Map old dev project IDs (21–30) → new IDs
  const p: Record<number, number> = {};
  [21,22,23,24,25,26,27,28,29,30].forEach((oldId, i) => { p[oldId] = demoProjects[i].id; });

  // 3. Project members
  await db.insert(projectMembersTable).values([
    { projectId: p[21], userId: u[12], role: "prosjektleder" },
    { projectId: p[21], userId: u[14], role: "medlem" },
    { projectId: p[21], userId: u[15], role: "medlem" },
    { projectId: p[22], userId: u[15], role: "prosjektleder" },
    { projectId: p[22], userId: u[16], role: "medlem" },
    { projectId: p[23], userId: u[12], role: "medlem" },
    { projectId: p[23], userId: u[13], role: "medlem" },
    { projectId: p[23], userId: u[14], role: "prosjektleder" },
    { projectId: p[24], userId: u[15], role: "medlem" },
    { projectId: p[24], userId: u[16], role: "prosjektleder" },
    { projectId: p[25], userId: u[12], role: "prosjektleder" },
    { projectId: p[25], userId: u[13], role: "medlem" },
    { projectId: p[26], userId: u[13], role: "prosjektleder" },
    { projectId: p[26], userId: u[14], role: "medlem" },
    { projectId: p[26], userId: u[16], role: "medlem" },
    { projectId: p[27], userId: u[12], role: "medlem" },
    { projectId: p[27], userId: u[15], role: "prosjektleder" },
    { projectId: p[28], userId: u[14], role: "prosjektleder" },
    { projectId: p[28], userId: u[16], role: "medlem" },
    { projectId: p[29], userId: u[12], role: "prosjektleder" },
    { projectId: p[29], userId: u[15], role: "medlem" },
    { projectId: p[30], userId: u[13], role: "medlem" },
    { projectId: p[30], userId: u[16], role: "prosjektleder" },
  ]).onConflictDoNothing();

  // 4. Tasks
  await db.insert(tasksTable).values([
    { projectId: p[21], title: "Kravspesifikasjon og interessentanalyse", status: "fullfort", priority: "hoy", assigneeId: u[12], dueDate: "2025-02-28" },
    { projectId: p[21], title: "Valg av AI-plattform og leverandør", status: "fullfort", priority: "hoy", assigneeId: u[12], dueDate: "2025-03-31" },
    { projectId: p[21], title: "Integrasjon mot CRM-system", status: "venter", priority: "hoy", assigneeId: u[15], dueDate: "2025-07-15" },
    { projectId: p[21], title: "Trene AI-modell på historiske henvendelser", status: "venter", priority: "middels", assigneeId: u[14], dueDate: "2025-07-31" },
    { projectId: p[21], title: "Brukertest med pilotgruppe", status: "ikke_startet", priority: "middels", assigneeId: u[15], dueDate: "2025-08-31" },
    { projectId: p[21], title: "Utrulling og opplæring av kundeserviceteamet", status: "ikke_startet", priority: "lav", assigneeId: u[12], dueDate: "2025-09-20" },
    { projectId: p[22], title: "Kartlegging av fakturaflyt", status: "fullfort", priority: "hoy", assigneeId: u[15], dueDate: "2024-04-15" },
    { projectId: p[22], title: "Valg og anskaffelse av OCR-løsning", status: "fullfort", priority: "hoy", assigneeId: u[15], dueDate: "2024-05-31" },
    { projectId: p[22], title: "Integrasjon mot ERP", status: "fullfort", priority: "hoy", assigneeId: u[16], dueDate: "2024-08-31" },
    { projectId: p[22], title: "Testing og godkjenning av automatisering", status: "fullfort", priority: "middels", assigneeId: u[15], dueDate: "2024-10-31" },
    { projectId: p[22], title: "Opplæring av økonomiavdelingen", status: "fullfort", priority: "lav", assigneeId: u[16], dueDate: "2024-11-20" },
    { projectId: p[23], title: "Kartlegging av dagens onboarding-prosess", status: "fullfort", priority: "hoy", assigneeId: u[14], dueDate: "2025-03-01" },
    { projectId: p[23], title: "Valg av digital onboarding-plattform", status: "fullfort", priority: "hoy", assigneeId: u[14], dueDate: "2025-03-31" },
    { projectId: p[23], title: "Konfigurere arbeidsflyt og automatiske e-poster", status: "pagaar", priority: "hoy", assigneeId: u[13], dueDate: "2025-07-01" },
    { projectId: p[23], title: "Pilottest med 5 nye ansatte", status: "ikke_startet", priority: "middels", assigneeId: u[14], dueDate: "2025-08-01" },
    { projectId: p[23], title: "Utrulling til alle avdelinger", status: "ikke_startet", priority: "lav", assigneeId: u[12], dueDate: "2025-08-31" },
    { projectId: p[24], title: "Forprosjekt og mulighetsanalyse", status: "ikke_startet", priority: "hoy", assigneeId: u[16], dueDate: "2025-10-31" },
    { projectId: p[24], title: "Kravspesifikasjon for IoT-sensorer", status: "ikke_startet", priority: "middels", assigneeId: u[15], dueDate: "2025-11-30" },
    { projectId: p[25], title: "Behovsanalyse og intervju med leverandører", status: "fullfort", priority: "hoy", assigneeId: u[12], dueDate: "2024-11-15" },
    { projectId: p[25], title: "Design av brukergrensesnitt", status: "fullfort", priority: "middels", assigneeId: u[13], dueDate: "2024-12-31" },
    { projectId: p[25], title: "Utvikling av portal (backend)", status: "venter", priority: "hoy", assigneeId: u[12], dueDate: "2025-05-31" },
    { projectId: p[25], title: "Integrasjon mot innkjøpssystem", status: "ikke_startet", priority: "hoy", assigneeId: u[13], dueDate: "2025-06-15" },
    { projectId: p[26], title: "Inventar av eksisterende dokumenter og mapper", status: "fullfort", priority: "middels", assigneeId: u[13], dueDate: "2025-04-01" },
    { projectId: p[26], title: "Konfigurere AI-klassifiseringsmodell", status: "pagaar", priority: "hoy", assigneeId: u[14], dueDate: "2025-07-31" },
    { projectId: p[26], title: "Migrere dokumenter til ny plattform", status: "pagaar", priority: "hoy", assigneeId: u[16], dueDate: "2025-09-30" },
    { projectId: p[26], title: "Opplæring av ansatte", status: "ikke_startet", priority: "middels", assigneeId: u[13], dueDate: "2025-11-30" },
    { projectId: p[27], title: "Koble til ERP-datakilder", status: "fullfort", priority: "hoy", assigneeId: u[15], dueDate: "2024-07-31" },
    { projectId: p[27], title: "Lage rapportmal i BI-verktøy", status: "fullfort", priority: "hoy", assigneeId: u[15], dueDate: "2024-09-30" },
    { projectId: p[27], title: "Automatisere månedlig kjøring", status: "fullfort", priority: "middels", assigneeId: u[12], dueDate: "2024-11-30" },
    { projectId: p[27], title: "Godkjenning og utrulling", status: "fullfort", priority: "lav", assigneeId: u[15], dueDate: "2024-12-15" },
    { projectId: p[28], title: "Kravspesifikasjon fra HR og lønnsavdeling", status: "fullfort", priority: "hoy", assigneeId: u[14], dueDate: "2025-02-01" },
    { projectId: p[28], title: "Anskaffelse av timeregistreringsapp", status: "fullfort", priority: "hoy", assigneeId: u[14], dueDate: "2025-03-01" },
    { projectId: p[28], title: "Integrasjon mot lønnssystem", status: "pagaar", priority: "hoy", assigneeId: u[16], dueDate: "2025-07-01" },
    { projectId: p[28], title: "Pilottest i to avdelinger", status: "ikke_startet", priority: "middels", assigneeId: u[14], dueDate: "2025-07-15" },
    { projectId: p[29], title: "Datainnsamling og anonymisering", status: "fullfort", priority: "hoy", assigneeId: u[12], dueDate: "2024-02-29" },
    { projectId: p[29], title: "Trene NLP-modell", status: "fullfort", priority: "hoy", assigneeId: u[15], dueDate: "2024-04-30" },
    { projectId: p[29], title: "Dashboard for trendanalyse", status: "fullfort", priority: "middels", assigneeId: u[12], dueDate: "2024-06-30" },
    { projectId: p[30], title: "Mulighetsstudie og energianalyse", status: "ikke_startet", priority: "hoy", assigneeId: u[16], dueDate: "2026-02-28" },
    { projectId: p[30], title: "Innhente tilbud fra leverandører", status: "ikke_startet", priority: "middels", assigneeId: u[13], dueDate: "2026-03-31" },
  ]);

  // 5. Effects
  await db.insert(effectEntriesTable).values([
    { projectId: p[21], date: "2025-05-01", description: "Automatiserte svar på FAQ reduserer 200 henvendelser/mnd", value: "240000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u[12] },
    { projectId: p[21], date: "2025-06-01", description: "Redusert overtid i kundeserviceteamet", value: "85000", unit: "kr", type: "lopende_arlig", confidenceLevel: "lav", registeredBy: u[15] },
    { projectId: p[22], date: "2025-01-01", description: "Automatisk innlesing av 3 000 fakturaer per mnd", value: "2100", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u[15] },
    { projectId: p[22], date: "2025-01-01", description: "Reduksjon i feilposteringer og korrekturer", value: "350", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u[16] },
    { projectId: p[22], date: "2024-12-01", description: "Engangsbesparelse: avviklet lisens for gammelt fakturasystem", value: "120000", unit: "kr", type: "engangs", confidenceLevel: "hoy", registeredBy: u[15] },
    { projectId: p[23], date: "2025-05-15", description: "Redusert tid til forberedelse av velkomstpakke", value: "45000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u[14] },
    { projectId: p[26], date: "2025-06-01", description: "Raskere tilgang til kontrakter og prosedyrer", value: "180000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u[13] },
    { projectId: p[27], date: "2025-01-01", description: "Automatisk generering av 12 månedlige styrerapporter", value: "480", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u[15] },
    { projectId: p[27], date: "2024-12-15", description: "Eliminerte eksternt konsulentoppdrag for datauthenting", value: "210000", unit: "kr", type: "engangs", confidenceLevel: "hoy", registeredBy: u[12] },
    { projectId: p[28], date: "2025-04-01", description: "Reduserte feil i lønnskjøringer", value: "95000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u[14] },
    { projectId: p[29], date: "2024-08-01", description: "Eliminerte månedlig manuell analyseprosess (160 timer/mnd)", value: "1920", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u[12] },
    { projectId: p[29], date: "2024-09-01", description: "Økt kundetilfredshet ga redusert churn", value: "450000", unit: "kr", type: "lopende_arlig", confidenceLevel: "lav", registeredBy: u[15] },
  ]);

  // 6. Costs
  await db.insert(costEntriesTable).values([
    { projectId: p[21], date: "2025-01-15", description: "Lisens AI-plattform (årsavgift)", value: "320000", registeredBy: u[12] },
    { projectId: p[21], date: "2025-03-01", description: "Konsulentbistand – integrasjonsutvikling", value: "480000", registeredBy: u[12] },
    { projectId: p[22], date: "2024-04-01", description: "Anskaffelse OCR-løsning", value: "195000", registeredBy: u[15] },
    { projectId: p[22], date: "2024-06-01", description: "Konsulentbistand ERP-integrasjon", value: "310000", registeredBy: u[15] },
    { projectId: p[23], date: "2025-02-15", description: "Lisens onboarding-plattform", value: "85000", registeredBy: u[14] },
    { projectId: p[23], date: "2025-04-01", description: "Intern prosjekttid (estimert kost)", value: "120000", registeredBy: u[12] },
    { projectId: p[25], date: "2024-10-15", description: "Foranalyse og designarbeid", value: "145000", registeredBy: u[13] },
    { projectId: p[26], date: "2025-03-01", description: "Lisens dokumenthåndteringsplattform", value: "210000", registeredBy: u[13] },
    { projectId: p[26], date: "2025-04-01", description: "Datamigrering og oppsett", value: "165000", registeredBy: u[14] },
    { projectId: p[27], date: "2024-06-01", description: "BI-verktøy tilleggsmodul", value: "75000", registeredBy: u[15] },
    { projectId: p[28], date: "2025-01-15", description: "Lisens timeregistreringsapp", value: "55000", registeredBy: u[14] },
    { projectId: p[28], date: "2025-02-01", description: "Konsulentbistand lønnsintegrasjon", value: "95000", registeredBy: u[16] },
    { projectId: p[29], date: "2024-01-15", description: "NLP-lisens og skyinfrastruktur", value: "180000", registeredBy: u[12] },
  ]);

  res.json({ ok: true, projects: demoProjects.length, users: demoUsers.length });
});

// ─── Check demo data status ───────────────────────────────────────────────────
router.get("/admin/seed-demo/status", requireAdmin, async (req, res) => {
  const [row] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, "seed_admin1"))
    .limit(1);
  const projectCount = await db.$count(projectsTable);
  res.json({ seeded: !!row, projectCount });
});

// ─── Delete ALL projects (cascade removes tasks, effects, costs, etc.) ────────
router.delete("/admin/reset-projects", requireAdmin, async (req, res) => {
  const projects = await db.select({ id: projectsTable.id }).from(projectsTable);
  if (projects.length === 0) { res.json({ deleted: 0 }); return; }
  const ids = projects.map((p) => p.id);
  await db.delete(projectsTable).where(inArray(projectsTable.id, ids));

  // Also delete seed users (those with seed_ clerk IDs)
  const seedClerkIds = ["seed_admin1","seed_user2","seed_user3","seed_user4","seed_user5"];
  await db.delete(usersTable).where(inArray(usersTable.clerkId, seedClerkIds));

  res.json({ deleted: ids.length });
});

export default router;
