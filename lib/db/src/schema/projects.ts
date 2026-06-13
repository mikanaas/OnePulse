import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  businessUnit: text("business_unit"),
  status: text("status").notNull().default("ide"),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  startDate: date("start_date", { mode: "string" }),
  plannedEndDate: date("planned_end_date", { mode: "string" }),
  goalText: text("goal_text"),
  goalSavingsValue: numeric("goal_savings_value", { precision: 15, scale: 2 }),
  goalSavingsUnit: text("goal_savings_unit"),
  goalDate: date("goal_date", { mode: "string" }),
  estimatedHours: numeric("estimated_hours", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectMembersTable = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("medlem"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const insertProjectMemberSchema = createInsertSchema(projectMembersTable).omit({ id: true, joinedAt: true });
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
