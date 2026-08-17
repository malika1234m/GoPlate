import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { planOf, hasActiveAccess, trialDaysLeft } from "@/lib/plans";

const PAGE_SIZE = 50;

/**
 * Owner accounts for the console. Paged rather than returning everything:
 * this list is the one that grows without bound.
 */
export async function GET(req: Request) {
  const { deny } = await requireAdmin(req);
  if (deny) return deny;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);

  // SQLite's LIKE is already case-insensitive for ASCII, which is what emails
  // are — Prisma's `mode: "insensitive"` is not supported on this provider.
  const where = q
    ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
    : {};

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
        createdAt: true,
        passwordHash: true,
        googleId: true,
        _count: { select: { restaurants: true, upgradeRequests: true } },
      },
    }),
  ]);

  return Response.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      plan: planOf(u),
      subscribed: u.stripeSubscriptionId !== "",
      accessActive: hasActiveAccess(u),
      trialDaysLeft: trialDaysLeft(u),
      restaurants: u._count.restaurants,
      upgradeRequests: u._count.upgradeRequests,
      // How they sign in, so support can answer "I can't log in" quickly.
      signIn: u.googleId ? (u.passwordHash ? "google+password" : "google") : "password",
      createdAt: u.createdAt,
    })),
  });
}
