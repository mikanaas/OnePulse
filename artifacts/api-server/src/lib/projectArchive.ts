import { projectsTable } from "@workspace/db";
import { and, eq, isNotNull, isNull, ne, notInArray, or } from "drizzle-orm";

export const activeProjectsCondition = () =>
  and(isNull(projectsTable.archivedAt), ne(projectsTable.status, "avsluttet"));

export const activeProjectListCondition = () =>
  and(isNull(projectsTable.archivedAt), notInArray(projectsTable.status, ["avsluttet", "i_drift"]));

export const operationalProjectsCondition = () =>
  and(isNull(projectsTable.archivedAt), eq(projectsTable.status, "i_drift"));

export const archivedProjectsCondition = () =>
  or(isNotNull(projectsTable.archivedAt), eq(projectsTable.status, "avsluttet"));