import type { RequestHandler } from "express";
import { db } from "./db";
import { getPlatformIdentity } from "./platformAuth";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const identity = getPlatformIdentity(req);

  if (!identity) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Temporary compatibility: the clerkId property/column stores the Entra
    // object ID until the database schema is renamed in a dedicated migration.
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, identity.id))
      .limit(1);

    if (!user || !user.active) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    (req as any).dbUser = user;
    (req as any).platformIdentity = identity;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  await new Promise<void>((resolve) => {
    requireAuth(req, res, () => resolve());
  });

  if (res.headersSent) return;

  const user = (req as any).dbUser;
  if (user?.systemRole !== "admin") {
    res.status(403).json({ error: "Admin required" });
    return;
  }

  next();
};
