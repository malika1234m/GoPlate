import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { verifyGoogleIdToken, googleEnabled } from "@/lib/google-auth";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { TRIAL_DAYS } from "@/lib/plans";

const schema = z.object({ credential: z.string().min(1).max(4000) });

/**
 * Sign in or sign up with a Google ID token. One route for both: the client
 * can't know whether the Google account is new to us, and asking it to guess
 * would mean two round trips. `isNew` tells the caller where to go next —
 * sign-up continues to the restaurant step, a returning owner goes to the
 * dashboard.
 */
export async function POST(req: Request) {
  if (!googleEnabled()) {
    return Response.json(
      { error: "Google sign-in is not configured." },
      { status: 503 }
    );
  }
  if (!rateLimit(`google:${clientIp(req)}`, 10, 60_000)) {
    return tooManyRequests("Too many sign-in attempts. Wait a minute and try again.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const profile = await verifyGoogleIdToken(parsed.data.credential);
  if (!profile) {
    return Response.json({ error: "Could not verify your Google account." }, { status: 401 });
  }

  // Already linked — the usual path for a returning owner.
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  let isNew = false;

  if (!user) {
    // Signed up with a password first, now using the Google button on the same
    // address. Safe to link: Google told us it owns that verified email.
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.sub },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          googleId: profile.sub,
          // No password: this account signs in through Google until the owner
          // sets one via forgot-password.
          passwordHash: null,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
        },
      });
      isNew = true;
    }
  }

  const token = await signToken(user.id, user.tokenVersion);
  return Response.json({
    token,
    isNew,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
