import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { db } from "./db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);
    if (!user || !user.active) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as any).dbUser = user;
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
