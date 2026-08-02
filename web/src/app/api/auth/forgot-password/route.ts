import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { appUrl, emailConfigured, passwordResetEmail, sendEmail } from "@/lib/email";
import { createResetToken, RESET_TTL_MINUTES } from "@/lib/password-reset";

const schema = z.object({ email: z.string().email().toLowerCase() });

/**
 * Start a password reset.
 *
 * Always answers `{ ok: true }` for a well-formed address, whether or not an
 * account exists — otherwise this endpoint becomes a way to enumerate which
 * restaurant owners are registered.
 */
export async function POST(req: Request) {
  // Two budgets. The per-IP one only has to stop bulk abuse — it must stay
  // loose enough for a whole restaurant behind one NAT, and for someone who
  // mistypes their address a few times. The per-address budget below is the
  // tight one, because that is what actually mail-bombs a person.
  if (!rateLimit(`forgot:ip:${clientIp(req)}`, 15, 15 * 60_000)) {
    return tooManyRequests("Too many reset requests. Wait a few minutes and try again.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const { email } = parsed.data;

  // Failing loudly here is safe: it happens for every address, so it reveals
  // nothing about who has an account.
  if (!emailConfigured() && process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Password reset email isn't set up yet. Please contact support." },
      { status: 503 }
    );
  }

  if (!rateLimit(`forgot:email:${email}`, 4, 15 * 60_000)) {
    return tooManyRequests("Too many reset requests for that address. Try again shortly.");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Any earlier link for this account stops working the moment a new one is
    // issued, so a forwarded old email can't be used later.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const { token, tokenHash } = createResetToken();
    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
      },
    });

    const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendEmail(
        passwordResetEmail({
          to: user.email,
          name: user.name,
          url,
          expiresMinutes: RESET_TTL_MINUTES,
        })
      );
    } catch (err) {
      // Don't strand the owner with a silent success when delivery failed.
      console.error("Password reset email failed:", err);
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return Response.json(
        { error: "We couldn't send the email just now. Please try again in a minute." },
        { status: 502 }
      );
    }
  }

  return Response.json({ ok: true });
}
