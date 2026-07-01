import { pgTable, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const dmaicTable = pgTable("dmaic_analyses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique().references(() => projectsTable.id, { onDelete: "cascade" }),
  defineData: jsonb("define_data").default({}).notNull(),
  measureData: jsonb("measure_data").default([]).notNull(),
  analyzeData: jsonb("analyze_data").default({}).notNull(),
  improveData: jsonb("improve_data").default({}).notNull(),
  controlData: jsonb("control_data").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DmaicRow = typeof dmaicTable.$inferSelect;
