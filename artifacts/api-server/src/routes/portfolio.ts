import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import {
  projectsTable,
  effectEntriesTable,
  costEntriesTable,
  projectMembersTable,
} from "@workspace/db";
import { sql, count } from "drizzle-orm";

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

export default router;
