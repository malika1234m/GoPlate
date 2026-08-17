import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

/**
 * Back-office authentication, kept deliberately separate from the owner session
 * in src/lib/auth.ts.
 *
 * Same signing secret, different token shape: admin tokens carry `typ: "admin"`
 * and a subject that is an Admin row id, never a User id. `getAdminUser` refuses
 * anything without that claim, so an owner's bearer token — even a valid, freshly
 * issued one — cannot reach a single back-office route. The reverse holds too:
 * `getAuthUser` looks the subject up in `user`, where an admin id does not exist.
 */
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is not set. Refusing to start with an insecure fallback.");
}
const secret = new TextEncoder().encode(jwtSecret ?? "dev-secret-do-not-use-in-prod");

const ADMIN_TYP = "admin";

/**
 * Shorter than the 30-day owner session on purpose: this token can change every
 * customer's plan, so a forgotten laptop should stop being a problem sooner.
 */
const ADMIN_SESSION = "12h";

export async function signAdminToken(adminId: string, tokenVersion = 0): Promise<string> {
  return new SignJWT({ sub: adminId, ver: tokenVersion, typ: ADMIN_TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ADMIN_SESSION)
    .sign(secret);
}

/** Resolve the signed-in admin from a Bearer token, or null. */
export async function getAdmin(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    // The claim check is the whole security boundary — never drop it.
    if (payload.typ !== ADMIN_TYP || !payload.sub) return null;

    const admin = await prisma.admin.findUnique({ where: { id: payload.sub as string } });
    if (!admin || admin.tokenVersion !== ((payload.ver as number) ?? 0)) return null;
    return admin;
  } catch {
    return null;
  }
}

/**
 * Deliberately a 404, not a 401 or 403: an unauthenticated caller learns
 * nothing about which admin routes exist, so the back office cannot be mapped
 * by probing. The console itself never sees this — it redirects on 404 from an
 * /api/admin route.
 */
export function adminUnauthorized() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

/** Guard for every admin route: returns the admin, or the response to send back. */
export async function requireAdmin(req: Request) {
  const admin = await getAdmin(req);
  if (!admin) return { admin: null, deny: adminUnauthorized() as Response };
  return { admin, deny: null };
}
