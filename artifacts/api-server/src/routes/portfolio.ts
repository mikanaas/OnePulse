import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import {
  projectsTable,
  effectEntriesTable,
  costEntriesTable,
  projectMembersTable,
  tasksTable,
  activityLogTable,
} from "@workspace/db";
import { sql, count, inArray } from "drizzle-orm";

const router = Router();

// GET /api/portfolio/stats
router.get("/portfolio/stats", requireAuth, async (_req, res) => {
  const [stats] = await db
    .select({
      totalProjects: count(projectsTable.id),
      activeProjects: sql<number>`count(*) filter (where ${projectsTable.status} = 'pagaende')::int`,
      completedProjects: sql<number>`count(*) filter (where ${projectsTable.status} = 'fullfort')::int`,
      ideaProjects: sql<number>`count(*) filter (where ${projectsTable.status} = 'ide')::int`,
    })
    .from(projectsTable);

  const [savingsRow] = await db
    .select({ total: sql<number>`coalesce(sum(${effectEntriesTable.value}::numeric), 0)::float` })
    .from(effectEntriesTable);

  const [costsRow] = await db
    .select({ total: sql<number>`coalesce(sum(${costEntriesTable.value}::numeric), 0)::float` })
    .from(costEntriesTable);

  const [membersRow] = await db
    .select({ unique: sql<number>`count(distinct ${projectMembersTable.userId})::int` })
    .from(projectMembersTable);

  res.json({
    totalProjects: stats?.totalProjects ?? 0,
    activeProjects: stats?.activeProjects ?? 0,
    completedProjects: stats?.completedProjects ?? 0,
    ideaProjects: stats?.ideaProjects ?? 0,
    totalEstimatedSavings: 0,
    totalRealizedSavings: savingsRow?.total ?? 0,
    totalCosts: costsRow?.total ?? 0,
    uniqueMembers: membersRow?.unique ?? 0,
  });
});

// GET /api/portfolio/savings-over-time
router.get("/portfolio/savings-over-time", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      date: effectEntriesTable.date,
      value: effectEntriesTable.value,
    })
    .from(effectEntriesTable)
    .orderBy(effectEntriesTable.date);

  let accumulated = 0;
  const points = rows.map((r) => {
    accumulated += Number(r.value);
    return { date: r.date, accumulated };
  });
  res.json(points);
});

// GET /api/portfolio/projects-by-status
router.get("/portfolio/projects-by-status", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      status: projectsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(projectsTable)
    .groupBy(projectsTable.status);
  res.json(rows);
});

// GET /api/portfolio/projects-by-unit
router.get("/portfolio/projects-by-unit", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      businessUnit: projectsTable.businessUnit,
      count: sql<number>`count(*)::int`,
    })
    .from(projectsTable)
    .groupBy(projectsTable.businessUnit);
  res.json(rows);
});

// GET /api/portfolio/savings-by-project
router.get("/portfolio/savings-by-project", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      projectId: projectsTable.id,
      projectName: projectsTable.name,
      target: sql<number>`coalesce(${projectsTable.goalSavingsValue}::numeric, 0)::float`,
      realized: sql<number>`coalesce(sum(${effectEntriesTable.value}::numeric), 0)::float`,
    })
    .from(projectsTable)
    .leftJoin(effectEntriesTable, sql`${effectEntriesTable.projectId} = ${projectsTable.id}`)
    .groupBy(projectsTable.id, projectsTable.name, projectsTable.goalSavingsValue);
  res.json(rows);
});

// ─── Heatmap helpers ────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
function scoreFromDev(dev: number) { return clamp(50 + dev * 50, 0, 100); }
function fmtKr(v: number) { return v.toLocaleString("nb-NO") + " kr"; }
function fmtPct(v: number) { return (v >= 0 ? "+" : "") + Math.round(v) + "%"; }

type Metric = {
  score: number;
  deviation: number;
  displayValue: string;
  hasData: boolean;
  tooltipLines: string[];
};

function noData(): Metric {
  return { score: 50, deviation: 0, displayValue: "–", hasData: false, tooltipLines: ["Ingen data"] };
}

function activityScore(daysSince: number): number {
  // 0d→100, 7d→85, 14d→70, 30d→40, 60d→15, 90d+→5
  if (daysSince <= 0) return 100;
  if (daysSince <= 7)  return 100 - (daysSince / 7) * 15;
  if (daysSince <= 14) return 85 - ((daysSince - 7) / 7) * 15;
  if (daysSince <= 30) return 70 - ((daysSince - 14) / 16) * 30;
  if (daysSince <= 60) return 40 - ((daysSince - 30) / 30) * 25;
  if (daysSince <= 90) return 15 - ((daysSince - 60) / 30) * 10;
  return 5;
}

function totalLabel(score: number): string {
  if (score >= 70) return "På sporet";
  if (score >= 45) return "Følg opp";
  return "Krever oppfølging";
}

// GET /api/portfolio/heatmap
router.get("/portfolio/heatmap", requireAuth, async (req, res) => {
  const statusParam = (req.query.statuses as string) || "pagaende,pause";
  const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);

  const projects = await db
    .select()
    .from(projectsTable)
    .where(statuses.length ? inArray(projectsTable.status, statuses) : undefined);

  if (projects.length === 0) {
    return res.json({ rows: [], columnAverages: { timeProgress: 50, savingsVsGoal: 50, taskFlow: 50, activityLevel: 50, netEffect: 50 } });
  }

  const pIds = projects.map((p) => p.id);

  const [tasks, effects, costs, activityRows] = await Promise.all([
    db.select().from(tasksTable).where(inArray(tasksTable.projectId, pIds)),
    db.select().from(effectEntriesTable).where(inArray(effectEntriesTable.projectId, pIds)),
    db.select().from(costEntriesTable).where(inArray(costEntriesTable.projectId, pIds)),
    db
      .select({
        projectId: activityLogTable.projectId,
        latest: sql<string>`max(${activityLogTable.createdAt})::text`,
      })
      .from(activityLogTable)
      .where(inArray(activityLogTable.projectId, pIds))
      .groupBy(activityLogTable.projectId),
  ]);

  const today = new Date();

  const rows = projects.map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const pEffects = effects.filter((e) => e.projectId === p.id);
    const pCosts = costs.filter((c) => c.projectId === p.id);
    const pActivity = activityRows.find((a) => a.projectId === p.id);

    const totalSavings = pEffects.reduce((s, e) => s + Number(e.value), 0);
    const totalCosts   = pCosts.reduce((s, c) => s + Number(c.value), 0);
    const net = totalSavings - totalCosts;

    // ── Metric 1: Time Progress ──────────────────────────────────────
    let timeProgress: Metric;
    if (pTasks.length > 0) {
      const doneTasks = pTasks.filter((t) => t.status === "fullfort").length;
      const actualPct = doneTasks / pTasks.length;
      const score = Math.round(actualPct * 100);
      timeProgress = {
        score,
        deviation: score - 50,
        displayValue: `${score}%`,
        hasData: true,
        tooltipLines: [
          `Fullførte oppgaver: ${doneTasks} / ${pTasks.length}`,
          `Fremdrift: ${score}%`,
        ],
      };
    } else {
      timeProgress = noData();
    }

    // ── Metric 2: Savings vs Goal ────────────────────────────────────
    let savingsVsGoal: Metric;
    const goalVal = Number(p.goalSavingsValue ?? 0);
    const goalDate = p.goalDate || p.plannedEndDate;
    if (goalVal > 0 && p.startDate && goalDate) {
      const start = new Date(p.startDate).getTime();
      const end   = new Date(goalDate).getTime();
      const totalDays = Math.max(1, (end - start) / 86400000);
      const daysSinceStart = Math.max(0, (today.getTime() - start) / 86400000);
      const expectedSavings = goalVal * clamp(daysSinceStart / totalDays, 0, 1);
      const dev = expectedSavings > 0 ? (totalSavings - expectedSavings) / goalVal : (totalSavings > 0 ? 0.2 : 0);
      const score = scoreFromDev(clamp(dev, -1, 1));
      savingsVsGoal = {
        score,
        deviation: clamp(dev * 100, -100, 100),
        displayValue: fmtPct(clamp(dev * 100, -100, 100)),
        hasData: true,
        tooltipLines: [
          `Realisert: ${fmtKr(totalSavings)}`,
          `Forventet pa dette tidspunktet: ${fmtKr(Math.round(expectedSavings))}`,
          `Mal: ${fmtKr(goalVal)}`,
        ],
      };
    } else if (pEffects.length > 0) {
      savingsVsGoal = {
        score: 55,
        deviation: 5,
        displayValue: fmtKr(totalSavings),
        hasData: true,
        tooltipLines: [`Realisert: ${fmtKr(totalSavings)}`, "Ingen besparelsesmal satt"],
      };
    } else {
      savingsVsGoal = noData();
    }

    // ── Metric 3: Task Flow ──────────────────────────────────────────
    let taskFlow: Metric;
    if (pTasks.length > 0) {
      const openTasks = pTasks.filter((t) => t.status !== "fullfort");
      const overdueTasks = openTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < today
      );
      const score = overdueTasks.length === 0 && openTasks.length === 0
        ? 100
        : clamp((1 - overdueTasks.length / Math.max(1, openTasks.length)) * 100, 0, 100);
      const dev = score - 50;
      taskFlow = {
        score,
        deviation: dev,
        displayValue: overdueTasks.length === 0 ? "0 forfalte" : `${overdueTasks.length} forfalte`,
        hasData: true,
        tooltipLines: [
          `Totalt: ${pTasks.length} oppgaver`,
          `Apne: ${openTasks.length}`,
          `Forfalte: ${overdueTasks.length}`,
        ],
      };
    } else {
      taskFlow = noData();
    }

    // ── Metric 4: Activity Level ─────────────────────────────────────
    let activityLevel: Metric;
    if (pActivity?.latest) {
      const lastDate = new Date(pActivity.latest);
      const daysSince = Math.max(0, (today.getTime() - lastDate.getTime()) / 86400000);
      const score = activityScore(daysSince);
      activityLevel = {
        score,
        deviation: score - 50,
        displayValue: daysSince < 1 ? "I dag" : `${Math.round(daysSince)} d`,
        hasData: true,
        tooltipLines: [
          `Siste aktivitet: ${Math.round(daysSince)} dager siden`,
          `(${lastDate.toLocaleDateString("nb-NO")})`,
        ],
      };
    } else {
      activityLevel = noData();
    }

    // ── Metric 5: Net Effect ─────────────────────────────────────────
    let netEffect: Metric;
    if (pEffects.length > 0 || pCosts.length > 0) {
      let score: number;
      if (goalVal > 0) {
        score = scoreFromDev(clamp(net / goalVal, -1, 1));
      } else {
        score = net >= 0 ? clamp(55 + net / 50000, 55, 95) : clamp(50 + net / 50000, 10, 50);
      }
      const dev = score - 50;
      netEffect = {
        score,
        deviation: dev,
        displayValue: fmtKr(Math.round(net)),
        hasData: true,
        tooltipLines: [
          `Besparelse: ${fmtKr(totalSavings)}`,
          `Kostnader: ${fmtKr(totalCosts)}`,
          `Netto: ${fmtKr(Math.round(net))}`,
          ...(goalVal > 0 ? [`Andel av mal: ${Math.round((net / goalVal) * 100)}%`] : []),
        ],
      };
    } else {
      netEffect = noData();
    }

    // ── Total score ──────────────────────────────────────────────────
    const active = [timeProgress, savingsVsGoal, taskFlow, activityLevel, netEffect].filter((m) => m.hasData);
    const total = active.length > 0
      ? active.reduce((s, m) => s + m.score, 0) / active.length
      : 50;

    return {
      projectId: p.id,
      projectName: p.name,
      businessUnit: p.businessUnit ?? null,
      status: p.status,
      timeProgress,
      savingsVsGoal,
      taskFlow,
      activityLevel,
      netEffect,
      totalScore: Math.round(total),
      totalLabel: totalLabel(Math.round(total)),
    };
  });

  const avg = (key: "timeProgress" | "savingsVsGoal" | "taskFlow" | "activityLevel" | "netEffect") => {
    const dataRows = rows.filter((r) => r[key].hasData);
    return dataRows.length > 0
      ? Math.round(dataRows.reduce((s, r) => s + r[key].score, 0) / dataRows.length)
      : 50;
  };

  res.json({
    rows,
    columnAverages: {
      timeProgress: avg("timeProgress"),
      savingsVsGoal: avg("savingsVsGoal"),
      taskFlow: avg("taskFlow"),
      activityLevel: avg("activityLevel"),
      netEffect: avg("netEffect"),
    },
  });
});

export default router;
