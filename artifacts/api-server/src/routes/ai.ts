import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import {
  projectsTable,
  tasksTable,
  effectEntriesTable,
  costEntriesTable,
  activityLogTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// POST /api/ai/projects/:projectId/summary
router.post("/ai/projects/:projectId/summary", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const effects = await db.select().from(effectEntriesTable).where(eq(effectEntriesTable.projectId, projectId));
  const costs = await db.select().from(costEntriesTable).where(eq(costEntriesTable.projectId, projectId));
  const activity = await db.select().from(activityLogTable).where(eq(activityLogTable.projectId, projectId));

  const completedTasks = tasks.filter((t) => t.status === "fullfort").length;
  const totalSavings = effects.reduce((s, e) => s + Number(e.value), 0);
  const totalCosts = costs.reduce((s, c) => s + Number(c.value), 0);

  const prompt = `Du er en prosjektleder-assistent. Generer en kort norsk statusoppdatering for dette prosjektet:

Prosjekt: ${project.name}
Status: ${project.status}
Beskrivelse: ${project.description ?? "Ikke oppgitt"}
Mål: ${project.goalText ?? "Ikke oppgitt"}
Oppgaver: ${completedTasks}/${tasks.length} fullført
Realisert besparelse: ${totalSavings.toLocaleString("nb-NO")} kr
Totale kostnader: ${totalCosts.toLocaleString("nb-NO")} kr
Siste aktivitet (${activity.length > 3 ? "3 siste" : activity.length}):
${activity.slice(-3).map((a) => `- ${a.type}: ${a.content.slice(0, 100)}`).join("\n")}

Skriv en presis statusoppdatering på 2-4 setninger. Fokuser på fremdrift, risiko og neste steg. Bruk norsk.`;

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    // Store in activity log
    await db.insert(activityLogTable).values({
      projectId,
      userId: (req as any).dbUser.id,
      type: "ai_oppsummering",
      content: text,
    });
    res.json({ summary: text });
  } catch (err) {
    logger.error({ err }, "AI summary failed");
    res.status(500).json({ error: "AI not available", summary: `Prosjekt ${project.name} er i status "${project.status}". ${completedTasks} av ${tasks.length} oppgaver er fullført. Realisert besparelse: ${totalSavings.toLocaleString("nb-NO")} kr.` });
  }
});

// POST /api/ai/portfolio/query
router.post("/ai/portfolio/query", requireAuth, async (req, res) => {
  const { query } = req.body as { query: string };
  if (!query) { res.status(400).json({ error: "query required" }); return; }

  const projects = await db.select().from(projectsTable);
  const effects = await db.select().from(effectEntriesTable);
  const costs = await db.select().from(costEntriesTable);

  const totalSavings = effects.reduce((s, e) => s + Number(e.value), 0);
  const totalCosts = costs.reduce((s, c) => s + Number(c.value), 0);

  const portfolioSummary = `Portefølje: ${projects.length} prosjekter.
Statuser: ${[...new Set(projects.map((p) => p.status))].join(", ")}
Realisert besparelse totalt: ${totalSavings.toLocaleString("nb-NO")} kr
Totale kostnader: ${totalCosts.toLocaleString("nb-NO")} kr
Prosjekter: ${projects.map((p) => `${p.name} (${p.status}, ${p.businessUnit ?? "ukjent enhet"})`).join("; ")}`;

  const systemPrompt = `Du er en analytisk AI-assistent for et porteføljeforvalting-verktøy i en norsk virksomhet. Du hjelper med å analysere prosjektporteføljen. Svar alltid på norsk, presist og hjelpsomt.

Porteføljeinformasjon:
${portfolioSummary}`;

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
    });
    const answer = message.content[0].type === "text" ? message.content[0].text : "";
    res.json({ answer });
  } catch (err) {
    logger.error({ err }, "AI portfolio query failed");
    res.status(500).json({ error: "AI not available", answer: "Beklager, AI-tjenesten er ikke tilgjengelig for øyeblikket." });
  }
});

// POST /api/ai/effects/parse
router.post("/ai/effects/parse", requireAuth, async (req, res) => {
  const { text } = req.body as { text: string };
  if (!text) { res.status(400).json({ error: "text required" }); return; }

  const prompt = `Analyser følgende tekst og ekstraher informasjon om en prosjektgevinst/besparelse. Returner JSON med feltene:
- description (string): kort beskrivelse
- value (number): beløp/verdi
- unit (string): "kr" eller "timer"
- type (string): "engangs" eller "lopende_arlig"
- confidenceLevel (string): "lav", "middels" eller "hoy"
- date (string): dato på format YYYY-MM-DD, bruk dagens dato hvis ikke nevnt

Tekst: "${text}"

Returner KUN gyldig JSON, ingen annen tekst.`;

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    logger.error({ err }, "AI effect parse failed");
    res.status(500).json({
      error: "AI not available",
      description: text.slice(0, 80),
      value: 0,
      unit: "kr",
      type: "engangs",
      confidenceLevel: "middels",
      date: new Date().toISOString().slice(0, 10),
    });
  }
});

export default router;
