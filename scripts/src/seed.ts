import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run(sql: string, values?: any[]) {
  const res = await pool.query(sql, values);
  return res.rows;
}

async function seed() {
  console.log("🌱 Sletter eksisterende data...");
  await run(`DELETE FROM audit_log`);
  await run(`DELETE FROM activity_log`);
  await run(`DELETE FROM cost_entries`);
  await run(`DELETE FROM effect_entries`);
  await run(`DELETE FROM task_comments`);
  await run(`DELETE FROM tasks`);
  await run(`DELETE FROM project_members`);
  await run(`DELETE FROM projects`);
  await run(`DELETE FROM users WHERE clerk_id LIKE 'seed_%'`);

  // ─── Brukere ──────────────────────────────────────────────────────────────
  console.log("👥 Oppretter brukere...");
  const users = await Promise.all([
    run(`INSERT INTO users (clerk_id, name, email, system_role, active, last_login)
         VALUES ('seed_admin1', 'Kari Andersen', 'kari@oneco.no', 'admin', true, NOW() - INTERVAL '2 hours') RETURNING id`),
    run(`INSERT INTO users (clerk_id, name, email, system_role, active, last_login)
         VALUES ('seed_user2', 'Ole Martin Bakke', 'ole@oneco.no', 'user', true, NOW() - INTERVAL '1 day') RETURNING id`),
    run(`INSERT INTO users (clerk_id, name, email, system_role, active, last_login)
         VALUES ('seed_user3', 'Sofie Dahl', 'sofie@oneco.no', 'user', true, NOW() - INTERVAL '3 days') RETURNING id`),
    run(`INSERT INTO users (clerk_id, name, email, system_role, active, last_login)
         VALUES ('seed_user4', 'Erik Fjell', 'erik@oneco.no', 'user', true, NOW() - INTERVAL '5 days') RETURNING id`),
    run(`INSERT INTO users (clerk_id, name, email, system_role, active, last_login)
         VALUES ('seed_user5', 'Ingrid Holm', 'ingrid@oneco.no', 'user', true, NOW() - INTERVAL '1 week') RETURNING id`),
  ]);
  const [u1, u2, u3, u4, u5] = users.map(r => r[0].id as number);

  // ─── Prosjekter ───────────────────────────────────────────────────────────
  console.log("📁 Oppretter 10 prosjekter...");

  const projectDefs = [
    {
      name: "AI-drevet kundeservice chatbot",
      description: "Implementere en AI-assistent for å håndtere vanlige kundehenvendelser automatisk, redusere ventetid og frigjøre kapasitet hos kundeserviceteamet.",
      businessUnit: "OneCo Technologies",
      status: "pagaende",
      ownerId: u1,
      startDate: "2025-01-15",
      plannedEndDate: "2025-09-30",
      goalText: "Redusere manuell håndtering av henvendelser med 40 %",
      goalSavingsValue: "1800000",
      goalSavingsUnit: "kr",
      estimatedHours: "1200",
    },
    {
      name: "Automatisering av fakturabehandling",
      description: "Innføre RPA og OCR-løsning for automatisk innlesing og godkjenning av leverandørfakturaer. Målet er å eliminere manuell dataregistrering.",
      businessUnit: "OneCo Elektro",
      status: "fullfort",
      ownerId: u2,
      startDate: "2024-03-01",
      plannedEndDate: "2024-11-30",
      goalText: "Spare 2 500 timer per år på fakturahåndtering",
      goalSavingsValue: "2500",
      goalSavingsUnit: "timer",
      estimatedHours: "800",
    },
    {
      name: "Digitalt onboarding-system for nyansatte",
      description: "Erstatte papirbasert onboarding med en digital plattform som automatisk sender kontrakter, opplæringsmoduler og utstyrslister til nye medarbeidere.",
      businessUnit: "OneCo Networks",
      status: "pagaende",
      ownerId: u3,
      startDate: "2025-02-01",
      plannedEndDate: "2025-08-31",
      goalText: "Kutte onboarding-tid fra 3 dager til 4 timer per ansatt",
      goalSavingsValue: "650000",
      goalSavingsUnit: "kr",
      estimatedHours: "500",
    },
    {
      name: "Prediktivt vedlikehold for produksjonslinjer",
      description: "Bruke IoT-sensorer og maskinlæring for å forutsi og forebygge driftstopp på produksjonsutstyret. Redusere uplanlagte stopp med minst 60 %.",
      businessUnit: "OneCo Infra",
      status: "ide",
      ownerId: u4,
      startDate: "2025-09-01",
      plannedEndDate: "2026-06-30",
      goalText: "Redusere nedetid og vedlikeholdskostnader",
      goalSavingsValue: "4200000",
      goalSavingsUnit: "kr",
      estimatedHours: "2400",
    },
    {
      name: "Selvbetjeningsportal for leverandører",
      description: "Gi leverandørene tilgang til en portal der de selv kan registrere ordrebekreftelser, laste opp fakturaer og følge betalingsstatus – uten å kontakte innkjøpsavdelingen.",
      businessUnit: "OneCo Sverige",
      status: "pause",
      ownerId: u1,
      startDate: "2024-10-01",
      plannedEndDate: "2025-06-30",
      goalText: "Redusere innkjøpsadministrasjon med 30 %",
      goalSavingsValue: "920000",
      goalSavingsUnit: "kr",
      estimatedHours: "700",
    },
    {
      name: "Intelligent dokumenthåndtering med AI",
      description: "Implementere AI-drevet søk, klassifisering og tagging av interne dokumenter for å gjøre det enklere å finne riktig informasjon raskt.",
      businessUnit: "OneCo Technologies",
      status: "pagaende",
      ownerId: u5,
      startDate: "2025-03-01",
      plannedEndDate: "2025-12-31",
      goalText: "Redusere tid brukt på dokumentsøk med 50 %",
      goalSavingsValue: "1100000",
      goalSavingsUnit: "kr",
      estimatedHours: "900",
    },
    {
      name: "Automatisk rapportering til styret",
      description: "Koble til ERP og BI-systemer for å generere styrerapporten automatisk hver måned. Eliminere manuell datauthenting og PowerPoint-arbeid.",
      businessUnit: "OneCo Elektro",
      status: "fullfort",
      ownerId: u2,
      startDate: "2024-06-01",
      plannedEndDate: "2024-12-15",
      goalText: "Spare 40 timer per måned på rapportproduksjon",
      goalSavingsValue: "480",
      goalSavingsUnit: "timer",
      estimatedHours: "300",
    },
    {
      name: "Digital timeregistrering og ressursplanlegging",
      description: "Modernisere timeregistreringssystemet med mobilvennlig app og automatisk integrasjon mot prosjektplanlegging og lønn.",
      businessUnit: "OneCo Networks",
      status: "pagaende",
      ownerId: u3,
      startDate: "2025-01-01",
      plannedEndDate: "2025-07-31",
      goalText: "Redusere administrasjonstid og feil i lønn",
      goalSavingsValue: "380000",
      goalSavingsUnit: "kr",
      estimatedHours: "350",
    },
    {
      name: "AI-analyse av kundefeedback",
      description: "Bruke naturlig språkprosessering for å analysere kundeundersøkelser og støttehenvendelser automatisk, og identifisere trender og forbedringsområder i sanntid.",
      businessUnit: "OneCo Sverige",
      status: "avsluttet",
      ownerId: u1,
      startDate: "2024-01-01",
      plannedEndDate: "2024-07-31",
      goalText: "Automatisere analyseprosessen og øke innsiktskvalitet",
      goalSavingsValue: "600000",
      goalSavingsUnit: "kr",
      estimatedHours: "400",
    },
    {
      name: "Energioptimalisering med smart bygg-teknologi",
      description: "Installere smarte sensorer og bygningsautomasjon for å optimalisere energiforbruket i kontorbyggene. Dynamisk styring av lys, varme og ventilasjon.",
      businessUnit: "OneCo Infra",
      status: "ide",
      ownerId: u4,
      startDate: "2026-01-01",
      plannedEndDate: "2026-12-31",
      goalText: "Redusere energikostnader med 35 %",
      goalSavingsValue: "2800000",
      goalSavingsUnit: "kr",
      estimatedHours: "1800",
    },
  ];

  const projectIds: number[] = [];
  for (const p of projectDefs) {
    const [row] = await run(
      `INSERT INTO projects (name, description, business_unit, status, owner_id, start_date, planned_end_date, goal_text, goal_savings_value, goal_savings_unit, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [p.name, p.description, p.businessUnit, p.status, p.ownerId, p.startDate, p.plannedEndDate, p.goalText, p.goalSavingsValue, p.goalSavingsUnit, p.estimatedHours]
    );
    projectIds.push(row.id);
  }

  const [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10] = projectIds;

  // ─── Prosjektmedlemmer ────────────────────────────────────────────────────
  console.log("🤝 Legger til prosjektmedlemmer...");
  const memberships = [
    [p1, u1, "prosjektleder"], [p1, u2, "medlem"], [p1, u3, "medlem"],
    [p2, u2, "prosjektleder"], [p2, u4, "medlem"],
    [p3, u3, "prosjektleder"], [p3, u5, "medlem"], [p3, u1, "medlem"],
    [p4, u4, "prosjektleder"], [p4, u2, "medlem"],
    [p5, u1, "prosjektleder"], [p5, u5, "medlem"],
    [p6, u5, "prosjektleder"], [p6, u3, "medlem"], [p6, u4, "medlem"],
    [p7, u2, "prosjektleder"], [p7, u1, "medlem"],
    [p8, u3, "prosjektleder"], [p8, u4, "medlem"],
    [p9, u1, "prosjektleder"], [p9, u2, "medlem"],
    [p10, u4, "prosjektleder"], [p10, u5, "medlem"],
  ];
  for (const [pid, uid, role] of memberships) {
    await run(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)`, [pid, uid, role]);
  }

  // ─── Oppgaver ─────────────────────────────────────────────────────────────
  console.log("✅ Oppretter oppgaver...");
  const taskDefs: Array<{ projectId: number; title: string; status: string; priority: string; assigneeId: number; dueDate: string }> = [
    // P1 – AI chatbot (pågående)
    { projectId: p1, title: "Kravspesifikasjon og interessentanalyse", status: "fullfort", priority: "hoy", assigneeId: u1, dueDate: "2025-02-28" },
    { projectId: p1, title: "Valg av AI-plattform og leverandør", status: "fullfort", priority: "hoy", assigneeId: u1, dueDate: "2025-03-31" },
    { projectId: p1, title: "Integrasjon mot CRM-system", status: "pagaar", priority: "hoy", assigneeId: u2, dueDate: "2025-07-15" },
    { projectId: p1, title: "Trene AI-modell på historiske henvendelser", status: "pagaar", priority: "middels", assigneeId: u3, dueDate: "2025-07-31" },
    { projectId: p1, title: "Brukertest med pilotgruppe", status: "ikke_startet", priority: "middels", assigneeId: u2, dueDate: "2025-08-31" },
    { projectId: p1, title: "Utrulling og opplæring av kundeserviceteamet", status: "ikke_startet", priority: "lav", assigneeId: u1, dueDate: "2025-09-20" },

    // P2 – Faktura (fullført)
    { projectId: p2, title: "Kartlegging av fakturaflyt", status: "fullfort", priority: "hoy", assigneeId: u2, dueDate: "2024-04-15" },
    { projectId: p2, title: "Valg og anskaffelse av OCR-løsning", status: "fullfort", priority: "hoy", assigneeId: u2, dueDate: "2024-05-31" },
    { projectId: p2, title: "Integrasjon mot ERP", status: "fullfort", priority: "hoy", assigneeId: u4, dueDate: "2024-08-31" },
    { projectId: p2, title: "Testing og godkjenning av automatisering", status: "fullfort", priority: "middels", assigneeId: u2, dueDate: "2024-10-31" },
    { projectId: p2, title: "Opplæring av økonomiavdelingen", status: "fullfort", priority: "lav", assigneeId: u4, dueDate: "2024-11-20" },

    // P3 – Onboarding HR (pågående)
    { projectId: p3, title: "Kartlegging av dagens onboarding-prosess", status: "fullfort", priority: "hoy", assigneeId: u3, dueDate: "2025-03-01" },
    { projectId: p3, title: "Valg av digital onboarding-plattform", status: "fullfort", priority: "hoy", assigneeId: u3, dueDate: "2025-03-31" },
    { projectId: p3, title: "Konfigurere arbeidsflyt og automatiske e-poster", status: "pagaar", priority: "hoy", assigneeId: u5, dueDate: "2025-07-01" },
    { projectId: p3, title: "Pilottest med 5 nye ansatte", status: "ikke_startet", priority: "middels", assigneeId: u3, dueDate: "2025-08-01" },
    { projectId: p3, title: "Utrulling til alle avdelinger", status: "ikke_startet", priority: "lav", assigneeId: u1, dueDate: "2025-08-31" },

    // P4 – Prediktivt vedlikehold (idé)
    { projectId: p4, title: "Forprosjekt og mulighetsanalyse", status: "ikke_startet", priority: "hoy", assigneeId: u4, dueDate: "2025-10-31" },
    { projectId: p4, title: "Kravspesifikasjon for IoT-sensorer", status: "ikke_startet", priority: "middels", assigneeId: u2, dueDate: "2025-11-30" },

    // P5 – Leverandørportal (pause)
    { projectId: p5, title: "Behovsanalyse og intervju med leverandører", status: "fullfort", priority: "hoy", assigneeId: u1, dueDate: "2024-11-15" },
    { projectId: p5, title: "Design av brukergrensesnitt", status: "fullfort", priority: "middels", assigneeId: u5, dueDate: "2024-12-31" },
    { projectId: p5, title: "Utvikling av portal (backend)", status: "venter", priority: "hoy", assigneeId: u1, dueDate: "2025-05-31" },
    { projectId: p5, title: "Integrasjon mot innkjøpssystem", status: "ikke_startet", priority: "hoy", assigneeId: u5, dueDate: "2025-06-15" },

    // P6 – Dokumenthåndtering AI (pågående)
    { projectId: p6, title: "Inventar av eksisterende dokumenter og mapper", status: "fullfort", priority: "middels", assigneeId: u5, dueDate: "2025-04-01" },
    { projectId: p6, title: "Konfigurere AI-klassifiseringsmodell", status: "pagaar", priority: "hoy", assigneeId: u3, dueDate: "2025-07-31" },
    { projectId: p6, title: "Migrere dokumenter til ny plattform", status: "pagaar", priority: "hoy", assigneeId: u4, dueDate: "2025-09-30" },
    { projectId: p6, title: "Opplæring av ansatte", status: "ikke_startet", priority: "middels", assigneeId: u5, dueDate: "2025-11-30" },

    // P7 – Styreraportering (fullført)
    { projectId: p7, title: "Koble til ERP-datakilder", status: "fullfort", priority: "hoy", assigneeId: u2, dueDate: "2024-07-31" },
    { projectId: p7, title: "Lage rapportmal i BI-verktøy", status: "fullfort", priority: "hoy", assigneeId: u2, dueDate: "2024-09-30" },
    { projectId: p7, title: "Automatisere månedlig kjøring", status: "fullfort", priority: "middels", assigneeId: u1, dueDate: "2024-11-30" },
    { projectId: p7, title: "Godkjenning og utrulling", status: "fullfort", priority: "lav", assigneeId: u2, dueDate: "2024-12-15" },

    // P8 – Timeregistrering (pågående)
    { projectId: p8, title: "Kravspesifikasjon fra HR og lønnsavdeling", status: "fullfort", priority: "hoy", assigneeId: u3, dueDate: "2025-02-01" },
    { projectId: p8, title: "Anskaffelse av timeregistreringsapp", status: "fullfort", priority: "hoy", assigneeId: u3, dueDate: "2025-03-01" },
    { projectId: p8, title: "Integrasjon mot lønnssystem", status: "pagaar", priority: "hoy", assigneeId: u4, dueDate: "2025-07-01" },
    { projectId: p8, title: "Pilottest i to avdelinger", status: "ikke_startet", priority: "middels", assigneeId: u3, dueDate: "2025-07-15" },

    // P9 – AI-analyse kundefeedback (avsluttet)
    { projectId: p9, title: "Datainnsamling og anonymisering", status: "fullfort", priority: "hoy", assigneeId: u1, dueDate: "2024-02-29" },
    { projectId: p9, title: "Trene NLP-modell", status: "fullfort", priority: "hoy", assigneeId: u2, dueDate: "2024-04-30" },
    { projectId: p9, title: "Dashboard for trendanalyse", status: "fullfort", priority: "middels", assigneeId: u1, dueDate: "2024-06-30" },

    // P10 – Smart bygg (idé)
    { projectId: p10, title: "Mulighetsstudie og energianalyse", status: "ikke_startet", priority: "hoy", assigneeId: u4, dueDate: "2026-02-28" },
    { projectId: p10, title: "Innhente tilbud fra leverandører", status: "ikke_startet", priority: "middels", assigneeId: u5, dueDate: "2026-03-31" },
  ];

  for (const t of taskDefs) {
    await run(
      `INSERT INTO tasks (project_id, title, status, priority, assignee_id, due_date) VALUES ($1, $2, $3, $4, $5, $6)`,
      [t.projectId, t.title, t.status, t.priority, t.assigneeId, t.dueDate]
    );
  }

  // ─── Effekter / besparelser ────────────────────────────────────────────────
  console.log("💰 Registrerer effekter og besparelser...");
  const effectDefs = [
    // P1 - AI chatbot (pågående, noe realisert)
    { projectId: p1, date: "2025-05-01", description: "Automatiserte svar på FAQ reduserer 200 henvendelser/mnd", value: "240000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u1 },
    { projectId: p1, date: "2025-06-01", description: "Redusert overtid i kundeserviceteamet", value: "85000", unit: "kr", type: "lopende_arlig", confidenceLevel: "lav", registeredBy: u2 },

    // P2 - Faktura (fullført, full gevinst)
    { projectId: p2, date: "2025-01-01", description: "Automatisk innlesing av 3 000 fakturaer per mnd", value: "2100", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u2 },
    { projectId: p2, date: "2025-01-01", description: "Reduksjon i feilposteringer og korrekturer", value: "350", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u4 },
    { projectId: p2, date: "2024-12-01", description: "Engangsbesparelse: avviklet lisens for gammelt fakturasystem", value: "120000", unit: "kr", type: "engangs", confidenceLevel: "hoy", registeredBy: u2 },

    // P3 - Onboarding (pågående, tidlig fase)
    { projectId: p3, date: "2025-05-15", description: "Redusert tid til forberedelse av velkomstpakke", value: "45000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u3 },

    // P5 - Leverandørportal (pause, ingen nye gevinster)

    // P6 - Dokumenthåndtering (pågående)
    { projectId: p6, date: "2025-06-01", description: "Raskere tilgang til kontrakter og prosedyrer", value: "180000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u5 },

    // P7 - Styreraportering (fullført)
    { projectId: p7, date: "2025-01-01", description: "Automatisk generering av 12 månedlige styrerapporter", value: "480", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u2 },
    { projectId: p7, date: "2024-12-15", description: "Eliminerte eksternt konsulentoppdrag for datauthenting", value: "210000", unit: "kr", type: "engangs", confidenceLevel: "hoy", registeredBy: u1 },

    // P8 - Timeregistrering (pågående)
    { projectId: p8, date: "2025-04-01", description: "Reduserte feil i lønnskjøringer", value: "95000", unit: "kr", type: "lopende_arlig", confidenceLevel: "middels", registeredBy: u3 },

    // P9 - AI kundefeedback (avsluttet)
    { projectId: p9, date: "2024-08-01", description: "Eliminerte månedlig manuell analyseprosess (160 timer/mnd)", value: "1920", unit: "timer", type: "lopende_arlig", confidenceLevel: "hoy", registeredBy: u1 },
    { projectId: p9, date: "2024-09-01", description: "Økt kundetilfredshet ga redusert churn", value: "450000", unit: "kr", type: "lopende_arlig", confidenceLevel: "lav", registeredBy: u2 },
  ];

  for (const e of effectDefs) {
    await run(
      `INSERT INTO effect_entries (project_id, date, description, value, unit, type, confidence_level, registered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [e.projectId, e.date, e.description, e.value, e.unit, e.type, e.confidenceLevel, e.registeredBy]
    );
  }

  // ─── Kostnader ───────────────────────────────────────────────────────────
  console.log("📊 Registrerer kostnader...");
  const costDefs = [
    { projectId: p1, date: "2025-01-15", description: "Lisens AI-plattform (årsavgift)", value: "320000", registeredBy: u1 },
    { projectId: p1, date: "2025-03-01", description: "Konsulentbistand – integrasjonsutvikling", value: "480000", registeredBy: u1 },
    { projectId: p2, date: "2024-04-01", description: "Anskaffelse OCR-løsning", value: "195000", registeredBy: u2 },
    { projectId: p2, date: "2024-06-01", description: "Konsulentbistand ERP-integrasjon", value: "310000", registeredBy: u2 },
    { projectId: p3, date: "2025-02-15", description: "Lisens onboarding-plattform", value: "85000", registeredBy: u3 },
    { projectId: p3, date: "2025-04-01", description: "Intern prosjekttid (estimert kost)", value: "120000", registeredBy: u1 },
    { projectId: p5, date: "2024-10-15", description: "Foranalyse og designarbeid", value: "145000", registeredBy: u5 },
    { projectId: p6, date: "2025-03-01", description: "Lisens dokumenthåndteringsplattform", value: "210000", registeredBy: u5 },
    { projectId: p6, date: "2025-04-01", description: "Datamigrering og oppsett", value: "165000", registeredBy: u3 },
    { projectId: p7, date: "2024-06-01", description: "BI-verktøy tilleggsmodul", value: "75000", registeredBy: u2 },
    { projectId: p8, date: "2025-01-15", description: "Lisens timeregistreringsapp", value: "55000", registeredBy: u3 },
    { projectId: p8, date: "2025-02-01", description: "Konsulentbistand lønnsintegrasjon", value: "95000", registeredBy: u4 },
    { projectId: p9, date: "2024-01-15", description: "NLP-lisens og skyinfrastruktur", value: "180000", registeredBy: u1 },
  ];

  for (const c of costDefs) {
    await run(
      `INSERT INTO cost_entries (project_id, date, description, value, registered_by) VALUES ($1, $2, $3, $4, $5)`,
      [c.projectId, c.date, c.description, c.value, c.registeredBy]
    );
  }

  // ─── Aktivitetslogg ────────────────────────────────────────────────────────
  console.log("📝 Legger til aktivitetslogg...");
  const activityDefs = [
    { projectId: p1, userId: u1, type: "milepael", content: "Kravspesifikasjon godkjent av styringsgruppen.", createdAt: "2025-02-28" },
    { projectId: p1, userId: u2, type: "kommentar", content: "Gjennomgikk tre leverandørtilbud. Anbefaler OpenAI-basert løsning med lokal datalagring.", createdAt: "2025-03-20" },
    { projectId: p1, userId: u1, type: "beslutning", content: "Besluttet: Velger skybasert plattform med GDPR-databehandleravtale i EU.", createdAt: "2025-04-02" },
    { projectId: p1, userId: u3, type: "kommentar", content: "CRM-integrasjonen er noe mer kompleks enn forventet. Justerer tidsplan med 3 uker.", createdAt: "2025-06-15" },

    { projectId: p2, userId: u2, type: "milepael", content: "Prosjektet fullført og overlevert til drift. Alle KPI-er oppnådd.", createdAt: "2024-11-30" },
    { projectId: p2, userId: u4, type: "kommentar", content: "Tester viser 98,5 % korrekt OCR-gjenkjenning. Langt over kravet på 95 %.", createdAt: "2024-10-15" },
    { projectId: p2, userId: u2, type: "beslutning", content: "Gammel manuell prosess avviklet fra 1. desember 2024.", createdAt: "2024-11-25" },

    { projectId: p3, userId: u3, type: "milepael", content: "Valgt plattform: BambooHR med norsk tilpasning. Kontrakt signert.", createdAt: "2025-03-31" },
    { projectId: p3, userId: u5, type: "kommentar", content: "Jobber med GDPR-sjekkliste for behandling av persondata i onboarding-plattformen.", createdAt: "2025-05-10" },

    { projectId: p5, userId: u1, type: "kommentar", content: "Prosjektet satt på pause grunnet høyere prioriterte IT-initiativ. Forventer gjenoppstart Q3 2025.", createdAt: "2025-01-20" },
    { projectId: p5, userId: u5, type: "beslutning", content: "Styringsgruppen vedtok pause til september 2025. Ressurser omfordelt til P6.", createdAt: "2025-01-22" },

    { projectId: p6, userId: u5, type: "milepael", content: "Fullstendig inventar gjennomført: 47 000 dokumenter kartlagt på 12 SharePoint-nettsteder.", createdAt: "2025-04-01" },
    { projectId: p6, userId: u3, type: "kommentar", content: "AI-modellen klassifiserer dokumenter med 89 % nøyaktighet i pilottesting. Trenger mer treningsdata.", createdAt: "2025-06-20" },

    { projectId: p7, userId: u2, type: "milepael", content: "Første automatisk genererte styrerapport godkjent av CFO uten endringer.", createdAt: "2024-12-05" },

    { projectId: p8, userId: u3, type: "kommentar", content: "Systemet er nå konfigurert og testet i sandbox-miljø. Klar for pilottest i august.", createdAt: "2025-06-30" },

    { projectId: p9, userId: u1, type: "milepael", content: "Prosjektet avsluttet og resultater presentert for ledelsen.", createdAt: "2024-08-15" },
    { projectId: p9, userId: u2, type: "kommentar", content: "NPS-score økt fra 42 til 61 etter at produktteamet fikk løpende innsikt fra AI-analysen.", createdAt: "2024-10-01" },
  ];

  for (const a of activityDefs) {
    await run(
      `INSERT INTO activity_log (project_id, user_id, type, content, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [a.projectId, a.userId, a.type, a.content, a.createdAt]
    );
  }

  await pool.end();
  console.log("✅ Seed fullført! 10 prosjekter, brukere, oppgaver, effekter, kostnader og aktivitet er lagt inn.");
}

seed().catch((err) => {
  console.error("❌ Seed feilet:", err);
  process.exit(1);
});
