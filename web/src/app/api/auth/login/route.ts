import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000)) {
    return tooManyRequests("Too many sign-in attempts. Wait a minute and try again.");
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Signed up with Google and never set a password. Say so rather than
  // returning "invalid password" — otherwise the owner retries forever against
  // a password that was never created.
  if (user && !user.passwordHash) {
    return Response.json(
      {
        error: "This account signs in with Google. Use “Continue with Google”, or reset your password to set one.",
        code: "use_google",
      },
      { status: 401 }
    );
  }

  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signToken(user.id, user.tokenVersion);
  return Response.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
