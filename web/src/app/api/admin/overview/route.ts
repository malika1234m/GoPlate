import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { PLANS, planOf } from "@/lib/plans";

/**
 * Numbers for the console's front page.
 *
 * Revenue is the sum of APPROVED upgrade requests, not a figure derived from
 * who is on which plan. Until the payment gateway is live, an approved slip is
 * the only evidence money actually arrived — counting plans instead would report
 * revenue for every account an admin activated by hand, including test ones.
 * MRR is reported separately and clearly labelled as a projection.
 */
export async function GET(req: Request) {
  const { deny } = await requireAdmin(req);
  if (deny) return deny;

  const now = new Date();

  const [users, approved, pendingRequests, openMessages, recentUsers] = await Promise.all([
    prisma.user.findMany({
      select: {
        plan: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
        createdAt: true,
      },
    }),
    prisma.upgradeRequest.findMany({
      where: { status: "APPROVED" },
      select: { amount: true, createdAt: true, reviewedAt: true },
    }),
    prisma.upgradeRequest.count({ where: { status: "PENDING" } }),
    prisma.supportMessage.count({ where: { status: "OPEN" } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
    }),
  ]);

  const paying = users.filter((u) => u.stripeSubscriptionId !== "");
  const onTrial = users.filter(
    (u) => u.stripeSubscriptionId === "" && u.trialEndsAt !== null && u.trialEndsAt > now
  );
  // Neither paying nor inside the free month: they can still be edited by an
  // admin, but they cannot edit their own menu.
  const lapsed = users.length - paying.length - onTrial.length;

  const byPlan = { basic: 0, starter: 0, pro: 0 };
  for (const u of paying) byPlan[planOf(u)] += 1;

  const revenueTotal = approved.reduce((sum, r) => sum + r.amount, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const revenue30d = approved
    .filter((r) => (r.reviewedAt ?? r.createdAt) >= thirtyDaysAgo)
    .reduce((sum, r) => sum + r.amount, 0);

  // What the current paying base is worth per month if nobody churns.
  const mrrProjected = paying.reduce((sum, u) => sum + PLANS[planOf(u)].priceUsd, 0);

  return Response.json({
    users: {
      total: users.length,
      paying: paying.length,
      onTrial: onTrial.length,
      lapsed,
      newLast30Days: recentUsers,
    },
    byPlan,
    revenue: {
      collectedTotal: Number(revenueTotal.toFixed(2)),
      collectedLast30Days: Number(revenue30d.toFixed(2)),
      approvedPayments: approved.length,
      mrrProjected,
    },
    queues: { pendingRequests, openMessages },
  });
}
