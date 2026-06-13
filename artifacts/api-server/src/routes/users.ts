import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../lib/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);
  if (existing) {
    const [updated] = await db.update(usersTable)
      .set({ name: name ?? existing.name, email: email ?? existing.email, lastLogin: new Date() })
      .where(eq(usersTable.clerkId, auth.userId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(usersTable)
      .values({ clerkId: auth.userId, name: name ?? "Unknown", email: email ?? "", lastLogin: new Date() })
      .returning();
    res.status(201).json(created);
  }
});

// GET /api/users
router.get("/users", requireAdmin, async (_req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users);
});

// POST /api/users
router.post("/users", requireAdmin, async (req, res) => {
  const { clerkId, name, email, systemRole } = req.body as { clerkId: string; name: string; email: string; systemRole?: string };
  const [user] = await db.insert(usersTable).values({ clerkId, name, email, systemRole: systemRole ?? "user" }).returning();
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
  await db.update(usersTable).set({ active: false }).where(eq(usersTable.id, id));
  res.status(204).end();
});

export default router;
