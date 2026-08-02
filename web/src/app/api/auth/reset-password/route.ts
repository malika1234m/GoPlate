import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { findValidReset } from "@/lib/password-reset";

/**
 * Check a reset link before showing the form, so an expired link explains
 * itself instead of failing after the owner has typed a new password.
 */
export async function GET(req: Request) {
  if (!rateLimit(`resetcheck:${clientIp(req)}`, 30, 15 * 60_000)) {
    return tooManyRequests("Too many attempts. Wait a few minutes and try again.");
  }
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const found = await findValidReset(token);
  if (!found.ok) return Response.json({ valid: false });
  return Response.json({ valid: true, email: found.email });
}

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

/**
 * Complete a password reset.
 *
 * Bumps `tokenVersion`, which invalidates every previously issued JWT — if the
 * reset was prompted by someone else having access, that access ends here.
 */
export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000)) {
    return tooManyRequests("Too many attempts. Wait a few minutes and try again.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Choose a password with at least 8 characters." },
      { status: 400 }
    );
  }
  const { token, password } = parsed.data;

  const found = await findValidReset(token);
  if (!found.ok) {
    return Response.json(
      { error: "This reset link has expired or has already been used. Request a new one." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: found.userId },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        tokenVersion: { increment: 1 },
      },
    }),
    // Consume this link and drop any siblings so the reset can't be replayed.
    prisma.passwordResetToken.deleteMany({ where: { userId: found.userId } }),
  ]);

  return Response.json({ ok: true });
}
