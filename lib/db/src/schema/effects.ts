import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const effectEntriesTable = pgTable("effect_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("kr"),
  type: text("type").notNull().default("engangs"),
  confidenceLevel: text("confidence_level").notNull().default("middels"),
  registeredBy: integer("registered_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const costEntriesTable = pgTable("cost_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  registeredBy: integer("registered_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEffectSchema = createInsertSchema(effectEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEffect = z.infer<typeof insertEffectSchema>;
export type EffectEntry = typeof effectEntriesTable.$inferSelect;

export const insertCostSchema = createInsertSchema(costEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCost = z.infer<typeof insertCostSchema>;
export type CostEntry = typeof costEntriesTable.$inferSelect;
