import crypto from "crypto";
import { prisma } from "./db";

/** How long a reset link stays usable. */
export const RESET_TTL_MINUTES = 60;

/**
 * Reset tokens are random 32-byte secrets. Only their SHA-256 is persisted, so
 * a database leak can't be replayed as a working link — the same reason we
 * never store raw passwords.
 */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type ResetLookup =
  | { ok: true; id: string; userId: string; email: string }
  | { ok: false };

/**
 * Resolve a raw token to its (unused, unexpired) row. Expired and used rows are
 * treated identically to unknown ones so a caller can't tell them apart.
 */
export async function findValidReset(token: string): Promise<ResetLookup> {
  if (!token) return { ok: false };
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) return { ok: false };
  return { ok: true, id: row.id, userId: row.user.id, email: row.user.email };
}
