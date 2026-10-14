import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { DB } from "./db.ts";
import { AppError, type Role } from "./domain.ts";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, digest] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
};
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}
export function authenticate(db: DB) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("acme_session="))
      ?.slice(13);
    if (!token) return next(new AppError(401, "Please sign in to continue."));
    const user = (await db
      .prepare(
        "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
      )
      .get(tokenHash(token), Date.now())) as User | undefined;
    if (!user)
      return next(
        new AppError(401, "Your session has expired. Please sign in."),
      );
    req.user = user;
    req.sessionToken = token;
    next();
  };
}
export function requireHR(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "HR_MANAGER")
    return next(new AppError(403, "HR manager access is required."));
  next();
}
export async function createSession(db: DB, userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.prepare("DELETE FROM sessions WHERE expires_at<?").run(Date.now());
  await db
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(tokenHash(token), userId, Date.now() + 8 * 60 * 60 * 1000);
  return token;
}
