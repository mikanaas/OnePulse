import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const projectLinksTable = pgTable("project_links", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  addedBy: integer("added_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLinkSchema = createInsertSchema(projectLinksTable).omit({ id: true, createdAt: true });
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type ProjectLink = typeof projectLinksTable.$inferSelect;
