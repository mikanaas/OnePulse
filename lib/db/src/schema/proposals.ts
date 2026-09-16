import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const proposalsTable = pgTable("improvement_proposals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("problem"),
  solutionDescription: text("solution_description"),
  effect: text("effect").notNull().default("liten"),
  complexity: text("complexity").notNull().default("krevende"),
  status: text("status").notNull().default("ny"),
  submittedBy: integer("submitted_by").references(() => usersTable.id),
  source: text("source").notNull().default("manual"),
  sourceMessageId: text("source_message_id"),
  sourceSender: text("source_sender"),
  convertedToProjectId: integer("converted_to_project_id").references(() => projectsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("improvement_proposals_submitter_source_message_unique").on(
    table.submittedBy,
    table.sourceMessageId,
  ),
]);

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  convertedToProjectId: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
