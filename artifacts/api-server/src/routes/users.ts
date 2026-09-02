import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../lib/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { usersTable } from "@workspace/db";
import { eq, and, like, not } from "drizzle-orm";

const router = Router();

// GET /api/users/me
router.get("/users/me", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  res.json(user);
});

// POST /api/users/me/sync — provision or update user from Clerk
router.post("/users/me/sync", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, email } = req.body as { name?: string; email?: string };

  // 1. Try by clerkId (normal path)
  const [byClerkId] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);
  if (byClerkId) {
    const [updated] = await db.update(usersTable)
      .set({ name: name ?? byClerkId.name, email: email ?? byClerkId.email, lastLogin: new Date() })
      .where(eq(usersTable.clerkId, auth.userId))
      .returning();

    // Auto-promote to admin if no real (non-seed) admins exist
    if (updated.systemRole !== "admin") {
      const [realAdmin] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.systemRole, "admin"), not(like(usersTable.clerkId, "seed_%"))))
        .limit(1);
      if (!realAdmin) {
        const [promoted] = await db.update(usersTable)
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

  // 2. Try by email — handles cross-environment logins (same person, different Clerk instance)
  if (email) {
    const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (byEmail) {
      const [merged] = await db.update(usersTable)
        .set({ clerkId: auth.userId, name: name ?? byEmail.name, lastLogin: new Date() })
        .where(eq(usersTable.email, email))
        .returning();

      // Promote to admin if no real (non-seed) admins exist yet
      const [realAdmin] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.systemRole, "admin"), not(like(usersTable.clerkId, "seed_%"))))
        .limit(1);
      if (!realAdmin) {
        const [promoted] = await db.update(usersTable)
          .set({ systemRole: "admin" })
          .where(eq(usersTable.id, merged.id))
          .returning();
        res.json(promoted);
        return;
      }
      res.json(merged);
      return;
    }
  }

  // 3. Brand new user — create and auto-promote to admin if no real admins exist
  const [created] = await db.insert(usersTable)
    .values({ clerkId: auth.userId, name: name ?? "Unknown", email: email ?? "", lastLogin: new Date() })
    .returning();

  const [realAdmin] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.systemRole, "admin"), not(like(usersTable.clerkId, "seed_%"))))
    .limit(1);
  if (!realAdmin || realAdmin.id === created.id) {
    const [promoted] = await db.update(usersTable)
      .set({ systemRole: "admin" })
      .where(eq(usersTable.id, created.id))
      .returning();
    res.status(201).json(promoted);
    return;
  }
  res.status(201).json(created);
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

// PUT /api/users/:id
router.put("/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, systemRole, active } = req.body as { name?: string; email?: string; systemRole?: string; active?: boolean };
  const [user] = await db.update(usersTable)
    .set({ ...(name != null ? { name } : {}), ...(email != null ? { email } : {}), ...(systemRole != null ? { systemRole } : {}), ...(active != null ? { active } : {}) })
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

export default router;
