import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { PLAN_IDS, planOf, hasActiveAccess, trialDaysLeft } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  plan: z.enum(PLAN_IDS as [string, ...string[]]).optional(),
  /**
   * Whether the account counts as paying. Access is gated on
   * stripeSubscriptionId being non-empty, so activating by hand writes the
   * sentinel "manual" — the same value the existing railway one-liner uses.
   * Deactivating clears it, which drops them back to trial-or-nothing.
   */
  active: z.boolean().optional(),
  /** Extend or restart the free month, e.g. to make up for an outage. */
  trialDays: z.number().int().min(0).max(365).optional(),
});

/** Change a single owner's plan or access. The console's main lever. */
export async function PATCH(req: Request, { params }: Params) {
  const { admin, deny } = await requireAdmin(req);
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  const { plan, active, trialDays } = parsed.data;
  const data: {
    plan?: string;
    stripeSubscriptionId?: string;
    trialEndsAt?: Date;
  } = {};

  if (plan) data.plan = plan;
  if (active !== undefined) data.stripeSubscriptionId = active ? "manual" : "";
  if (trialDays !== undefined) {
    data.trialEndsAt = new Date(Date.now() + trialDays * 86_400_000);
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Nothing to change." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data });

  console.log(
    `[admin] ${admin!.email} changed ${user.email}: ${JSON.stringify(data)}`
  );

  return Response.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      plan: planOf(updated),
      subscribed: updated.stripeSubscriptionId !== "",
      accessActive: hasActiveAccess(updated),
      trialDaysLeft: trialDaysLeft(updated),
    },
  });
}

/** Everything the console shows on one owner, including their history. */
export async function GET(req: Request, { params }: Params) {
  const { deny } = await requireAdmin(req);
  if (deny) return deny;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      restaurants: { select: { id: true, name: true, slug: true, isPublished: true } },
      upgradeRequests: { orderBy: { createdAt: "desc" } },
      supportMessages: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: planOf(user),
      subscribed: user.stripeSubscriptionId !== "",
      accessActive: hasActiveAccess(user),
      trialDaysLeft: trialDaysLeft(user),
      signIn: user.googleId ? (user.passwordHash ? "google+password" : "google") : "password",
      createdAt: user.createdAt,
      restaurants: user.restaurants,
      upgradeRequests: user.upgradeRequests,
      supportMessages: user.supportMessages,
    },
  });
}
