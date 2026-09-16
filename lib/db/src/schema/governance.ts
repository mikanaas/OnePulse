import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectGovernanceTable = pgTable("project_governance", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }).unique(),

  // 1. Ansvar og kontinuitet
  projectOwner: text("project_owner"),
  techOwner: text("tech_owner"),
  backupContact: text("backup_contact"),
  lastReviewedAt: date("last_reviewed_at", { mode: "string" }),
  nextReviewAt: date("next_review_at", { mode: "string" }),

  // 2. Forretningscase
  problemDescription: text("problem_description"),
  alternativesConsidered: text("alternatives_considered"),
  strategicGoalLink: text("strategic_goal_link"),

  // 3. Tekniske koblinger og avhengigheter
  platformTools: text("platform_tools"),
  systemIntegrations: text("system_integrations"),
  projectDependencies: text("project_dependencies"),

  // 4. Data og risiko
  dataTypes: text("data_types"),
  dataStorage: text("data_storage"),
  dataRetention: text("data_retention"),
  personalData: text("personal_data"),
  sensitiveData: text("sensitive_data"),
  aiVendor: text("ai_vendor"),
  dataGeography: text("data_geography"),
  integrationDataFlow: text("integration_data_flow"),
  contactEmail: text("contact_email"),
  riskClassification: text("risk_classification"),
  humanInLoop: text("human_in_loop"),

  // 5. Godkjenningsstatus
  governanceStatus: text("governance_status"),
  dpiaLink: text("dpia_link"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ProjectGovernance = typeof projectGovernanceTable.$inferSelect;
export type InsertProjectGovernance = typeof projectGovernanceTable.$inferInsert;
