import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { PLANS, type Plan } from "@/lib/plans";

/**
 * The review queue. Defaults to PENDING because that is the only status that
 * needs someone's attention — the console's badge counts the same thing.
 */
export async function GET(req: Request) {
  const { deny } = await requireAdmin(req);
  if (deny) return deny;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "PENDING").toUpperCase();
  const where = status === "ALL" ? {} : { status };

  const rows = await prisma.upgradeRequest.findMany({
    where,
    // Oldest pending first: whoever has been waiting longest gets served first.
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, plan: true, stripeSubscriptionId: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return Response.json({
    requests: rows.map((r) => ({
      id: r.id,
      status: r.status,
      requestedPlan: r.requestedPlan,
      planLabel: PLANS[r.requestedPlan as Plan]?.label ?? r.requestedPlan,
      planPriceUsd: PLANS[r.requestedPlan as Plan]?.priceUsd ?? 0,
      amount: r.amount,
      currency: r.currency,
      note: r.note,
      hasSlip: r.slipFile !== "",
      reviewNote: r.reviewNote,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy?.name ?? null,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        currentPlan: r.user.plan,
        currentlyPaying: r.user.stripeSubscriptionId !== "",
      },
    })),
  });
}
