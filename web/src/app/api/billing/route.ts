import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  PLANS,
  planOf,
  countModels,
  countVideos,
  countGenerationsThisMonth,
  hasActiveAccess,
  isSubscribed,
  trialDaysLeft,
} from "@/lib/plans";
import { stripeEnabled } from "@/lib/stripe";

/** Current plan, its limits, and usage — powers the app's billing screen. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const plan = planOf(user);
  const [restaurants, models, videos, modelsThisMonth, videosThisMonth] = await Promise.all([
    prisma.restaurant.count({ where: { ownerId: user.id } }),
    countModels(user.id),
    countVideos(user.id),
    // The monthly allowance is a separate meter from the library caps above:
    // it counts what was *built* this month, not what the menu holds now.
    countGenerationsThisMonth(user.id, "model"),
    countGenerationsThisMonth(user.id, "video"),
  ]);
  return Response.json({
    plan,
    label: PLANS[plan].label,
    limits: PLANS[plan],
    usage: { restaurants, models, videos, modelsThisMonth, videosThisMonth },
    subscribed: isSubscribed(user),
    trialDaysLeft: trialDaysLeft(user),
    accessActive: hasActiveAccess(user),
    billingConfigured: stripeEnabled(),
  });
}
