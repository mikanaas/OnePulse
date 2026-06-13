import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { projectGovernanceTable } from "@workspace/db";

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
  const body = req.body as Record<string, string | null>;

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
    aiVendor: body.aiVendor ?? null,
    dataGeography: body.dataGeography ?? null,
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
