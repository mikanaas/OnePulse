import { projectsTable } from "@workspace/db";
import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm";

export const activeProjectsCondition = () =>
  and(isNull(projectsTable.archivedAt), ne(projectsTable.status, "avsluttet"));

export const archivedProjectsCondition = () =>
  or(isNotNull(projectsTable.archivedAt), eq(projectsTable.status, "avsluttet"));