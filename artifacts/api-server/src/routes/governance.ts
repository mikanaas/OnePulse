import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { projectGovernanceTable, projectMembersTable } from "@workspace/db";

const router = Router();

// GET /api/projects/:projectId/governance
router.get("/projects/:projectId/governance", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const [row] = await db.select().from(projectGovernanceTable).where(eq(projectGovernanceTable.projectId, projectId)).limit(1);
  if (!row) {
    res.json({ projectId });
    return;
  }
  res.json(row);
});

// PUT /api/projects/:projectId/governance
router.put("/projects/:projectId/governance", requireAuth, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const user = (req as any).dbUser;
  if (user.systemRole !== "admin") {
    const [membership] = await db.select({ userId: projectMembersTable.userId })
      .from(projectMembersTable)
      .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, user.id)))
      .limit(1);
    if (!membership) { res.status(403).json({ error: "You cannot edit this project's governance data" }); return; }
  }
  const body = req.body as Record<string, string | null>;
  const enumFields: Record<string, Set<string>> = {
    personalData: new Set(["ja", "nei", "ukjent"]),
    sensitiveData: new Set(["ja", "nei", "ukjent"]),
    riskClassification: new Set(["lav", "middels", "høy"]),
    governanceStatus: new Set(["under_vurdering", "godkjent_pilot", "godkjent_produksjon", "amnesti", "avvikling"]),
  };
  for (const [field, allowed] of Object.entries(enumFields)) {
    const value = body[field];
    if (value != null && !allowed.has(value)) {
      res.status(400).json({ error: `Invalid ${field}` });
      return;
    }
  }

  const fields = {
    projectOwner: body.projectOwner ?? null,
    techOwner: body.techOwner ?? null,
    backupContact: body.backupContact ?? null,
    lastReviewedAt: body.lastReviewedAt ?? null,
    nextReviewAt: body.nextReviewAt ?? null,
    problemDescription: body.problemDescription ?? null,
    alternativesConsidered: body.alternativesConsidered ?? null,
    strategicGoalLink: body.strategicGoalLink ?? null,
    platformTools: body.platformTools ?? null,
    systemIntegrations: body.systemIntegrations ?? null,
    projectDependencies: body.projectDependencies ?? null,
    dataTypes: body.dataTypes ?? null,
    dataStorage: body.dataStorage ?? null,
    dataRetention: body.dataRetention ?? null,
    personalData: body.personalData ?? null,
    sensitiveData: body.sensitiveData ?? null,
    aiVendor: body.aiVendor ?? null,
    dataGeography: body.dataGeography ?? null,
    integrationDataFlow: body.integrationDataFlow ?? null,
    contactEmail: body.contactEmail ?? null,
    riskClassification: body.riskClassification ?? null,
    humanInLoop: body.humanInLoop ?? null,
    governanceStatus: body.governanceStatus ?? null,
    dpiaLink: body.dpiaLink ?? null,
  };

  const [existing] = await db.select({ id: projectGovernanceTable.id })
    .from(projectGovernanceTable)
    .where(eq(projectGovernanceTable.projectId, projectId))
    .limit(1);

  let result;
  if (existing) {
    [result] = await db.update(projectGovernanceTable)
      .set(fields)
      .where(eq(projectGovernanceTable.projectId, projectId))
      .returning();
  } else {
    [result] = await db.insert(projectGovernanceTable)
      .values({ projectId, ...fields })
      .returning();
  }

  res.json(result);
});

export default router;
