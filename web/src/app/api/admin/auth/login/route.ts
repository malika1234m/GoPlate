import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAdminToken } from "@/lib/admin-auth";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

/**
 * Back-office sign-in. Separate endpoint from /api/auth/login and separate
 * credentials — an owner account, however privileged, cannot sign in here.
 */
export async function POST(req: Request) {
  // Tighter than the owner login (10/min): there is a handful of admins ever,
  // so anything resembling guessing should be throttled hard.
  if (!rateLimit(`adminlogin:${clientIp(req)}`, 5, 60_000)) {
    return tooManyRequests("Too many attempts. Wait a minute and try again.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const admin = await prisma.admin.findUnique({ where: { email } });
  // One message for "no such admin" and "wrong password" — the back office
  // should not confirm which staff emails are real.
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await signAdminToken(admin.id, admin.tokenVersion);
  return Response.json({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}
