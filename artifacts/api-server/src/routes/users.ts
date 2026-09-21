import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { getPlatformIdentity } from "../lib/platformAuth";
import {
  activityLogTable,
  auditLogTable,
  costEntriesTable,
  effectEntriesTable,
  projectLinksTable,
  projectMembersTable,
  projectsTable,
  proposalsTable,
  taskCommentsTable,
  tasksTable,
  usersTable,
} from "@workspace/db";
import { eq, and, like, not } from "drizzle-orm";

const router = Router();

// GET /api/users/me
router.get("/users/me", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  res.json(user);
});

// POST /api/users/me/sync — JIT provision or update the signed-in Entra user
router.post("/users/me/sync", async (req, res, next) => {
  const identity = getPlatformIdentity(req);

  if (!identity) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id: entraObjectId, name, email } = identity;

  try {
    // Temporary compatibility: clerkId stores the Entra object ID until the
    // database schema is renamed in a dedicated migration.
    const [byIdentity] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, entraObjectId))
      .limit(1);

    if (byIdentity) {
      const [updated] = await db
        .update(usersTable)
        .set({ name, email, lastLogin: new Date() })
        .where(eq(usersTable.clerkId, entraObjectId))
        .returning();

      if (updated.systemRole !== "admin") {
        const [realAdmin] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(
            and(
              eq(usersTable.systemRole, "admin"),
              not(like(usersTable.clerkId, "seed_%")),
            ),
          )
          .limit(1);

        if (!realAdmin) {
          const [promoted] = await db
            .update(usersTable)
            .set({ systemRole: "admin" })
            .where(eq(usersTable.id, updated.id))
            .returning();
          res.json(promoted);
          return;
        }
      }

      res.json(updated);
      return;
    }

    // Match an existing record by email when migrating from another identity provider.
    const [byEmail] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (byEmail) {
      const [merged] = await db
        .update(usersTable)
        .set({
          clerkId: entraObjectId,
          name,
          email,
          lastLogin: new Date(),
        })
        .where(eq(usersTable.email, email))
        .returning();

      const [realAdmin] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.systemRole, "admin"),
            not(like(usersTable.clerkId, "seed_%")),
          ),
        )
        .limit(1);

      if (!realAdmin) {
        const [promoted] = await db
          .update(usersTable)
          .set({ systemRole: "admin" })
          .where(eq(usersTable.id, merged.id))
          .returning();
        res.json(promoted);
        return;
      }

      res.json(merged);
      return;
    }

    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId: entraObjectId,
        name,
        email,
        lastLogin: new Date(),
      })
      .returning();

    const [realAdmin] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.systemRole, "admin"),
          not(like(usersTable.clerkId, "seed_%")),
        ),
      )
      .limit(1);

    if (!realAdmin || realAdmin.id === created.id) {
      const [promoted] = await db
        .update(usersTable)
        .set({ systemRole: "admin" })
        .where(eq(usersTable.id, created.id))
        .returning();
      res.status(201).json(promoted);
      return;
    }

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// GET /api/users
router.get("/users", requireAuth, async (_req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users);
});

// POST /api/users
router.post("/users", requireAdmin, async (req, res) => {
  const { clerkId, name, email, systemRole } = req.body as { clerkId?: string; name: string; email: string; systemRole?: string };
  const resolvedClerkId = clerkId ?? `pending_${crypto.randomUUID()}`;
  const [user] = await db.insert(usersTable).values({ clerkId: resolvedClerkId, name, email, systemRole: systemRole ?? "user" }).returning();
  res.status(201).json(user);
});

// GET /api/users/:id
router.get("/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
});

// PATCH /api/users/:id
router.patch("/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, systemRole, active } = req.body as { name?: string; email?: string; systemRole?: string; active?: boolean };
  const normalizedEmail = email?.trim().toLowerCase();
  if (email != null && !normalizedEmail) {
    res.status(400).json({ error: "E-postadressen kan ikke være tom" });
    return;
  }
  if (normalizedEmail != null) {
    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, normalizedEmail), not(eq(usersTable.id, id))))
      .limit(1);
    if (existingUser) {
      res.status(409).json({ error: "E-postadressen er allerede i bruk" });
      return;
    }
  }
  const [user] = await db.update(usersTable)
    .set({
      ...(name != null ? { name: name.trim() } : {}),
      ...(normalizedEmail != null ? { email: normalizedEmail } : {}),
      ...(systemRole != null ? { systemRole } : {}),
      ...(active != null ? { active } : {}),
    })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
});

// DELETE /api/users/:id
router.delete("/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const currentUser = (req as any).dbUser;
  if (currentUser?.id === id) {
    res.status(400).json({ error: "Du kan ikke slette din egen brukerkonto" });
    return;
  }
  const [user] = await db.update(usersTable).set({ active: false }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

// DELETE /api/users/:id/permanent
router.delete("/users/:id/permanent", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const currentUser = (req as any).dbUser;
  if (currentUser?.id === id) {
    res.status(400).json({ error: "Du kan ikke slette din egen brukerkonto permanent" });
    return;
  }

  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Brukeren finnes ikke" });
    return;
  }

  const [ownedProject] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, id))
    .limit(1);
  if (ownedProject) {
    res.status(409).json({
      error: "Brukeren eier ett eller flere prosjekter. Flytt prosjekteierskapet før brukeren slettes permanent.",
    });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(projectMembersTable).where(eq(projectMembersTable.userId, id));
    await tx.delete(taskCommentsTable).where(eq(taskCommentsTable.userId, id));
    await tx.update(tasksTable).set({ assigneeId: null }).where(eq(tasksTable.assigneeId, id));
    await tx.update(effectEntriesTable).set({ registeredBy: null }).where(eq(effectEntriesTable.registeredBy, id));
    await tx.update(costEntriesTable).set({ registeredBy: null }).where(eq(costEntriesTable.registeredBy, id));
    await tx.update(activityLogTable).set({ userId: null }).where(eq(activityLogTable.userId, id));
    await tx.update(auditLogTable).set({ userId: null }).where(eq(auditLogTable.userId, id));
    await tx.update(projectLinksTable).set({ addedBy: null }).where(eq(projectLinksTable.addedBy, id));
    await tx.update(proposalsTable).set({ submittedBy: null }).where(eq(proposalsTable.submittedBy, id));
    await tx.delete(usersTable).where(eq(usersTable.id, id));
  });

  res.status(204).end();
});

export default router;
