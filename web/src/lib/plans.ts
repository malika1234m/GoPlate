import { prisma } from "./db";

/**
 * Subscription tiers — there is no permanently free plan. Every new account
 * gets a 30-day free trial with Basic-level access; after that, a paid
 * subscription is required to keep editing (published menus stay live for
 * customers). -1 means unlimited.
 */

export type Plan = "basic" | "starter" | "pro";

export const TRIAL_DAYS = 30;

export const PLANS: Record<
  Plan,
  {
    label: string;
    priceLabel: string;
    /** Monthly price as a number — the back office needs to do arithmetic on it. */
    priceUsd: number;
    maxRestaurants: number;
    maxModels: number;
    maxVideos: number;
  }
> = {
  basic: { label: "Basic", priceLabel: "$2/mo", priceUsd: 2, maxRestaurants: 1, maxModels: 2, maxVideos: 2 },
  starter: { label: "Starter", priceLabel: "$12/mo", priceUsd: 12, maxRestaurants: 1, maxModels: 10, maxVideos: 10 },
  pro: { label: "Pro", priceLabel: "$29/mo", priceUsd: 29, maxRestaurants: 10, maxModels: -1, maxVideos: -1 },
};

export const PLAN_IDS: Plan[] = ["basic", "starter", "pro"];

export function isPlan(value: string): value is Plan {
  return (PLAN_IDS as string[]).includes(value);
}

export function planOf(user: { plan: string }): Plan {
  if (user.plan === "pro") return "pro";
  if (user.plan === "starter") return "starter";
  return "basic"; // includes legacy "free" accounts
}

type AccessUser = { plan: string; stripeSubscriptionId: string; trialEndsAt: Date | null };

export function isSubscribed(user: AccessUser): boolean {
  return user.stripeSubscriptionId !== "";
}

export function isTrialActive(user: AccessUser): boolean {
  return user.trialEndsAt !== null && user.trialEndsAt.getTime() > Date.now();
}

export function trialDaysLeft(user: AccessUser): number {
  if (!user.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

/** Can this account still create and edit? Paid, or inside the free month. */
export function hasActiveAccess(user: AccessUser): boolean {
  return isSubscribed(user) || isTrialActive(user);
}

/** 402 guard for mutating endpoints once the free month is over. */
export function accessExpired(user: AccessUser): Response | null {
  if (hasActiveAccess(user)) return null;
  return Response.json(
    {
      error:
        "Your free month has ended. Subscribe to keep editing your menu — your published menu is still live for customers.",
      upgradeRequired: true,
      trialExpired: true,
    },
    { status: 402 }
  );
}

export function withinLimit(limit: number, used: number): boolean {
  return limit === -1 || used < limit;
}

/** Dishes with a 3D model (live or being generated) across all the user's restaurants. */
export async function countModels(ownerId: string): Promise<number> {
  return prisma.menuItem.count({
    where: {
      restaurant: { ownerId },
      modelStatus: { in: ["READY", "PROCESSING"] },
    },
  });
}

/** Dishes carrying any video (360° spin or story) across all the user's restaurants. */
export async function countVideos(ownerId: string): Promise<number> {
  return prisma.menuItem.count({
    where: {
      restaurant: { ownerId },
      OR: [{ NOT: { videoUrl: "" } }, { NOT: { storyVideoUrl: "" } }],
    },
  });
}

/** 402 Payment Required with a consistent shape the mobile app understands. */
export function upgradeRequired(message: string) {
  return Response.json({ error: message, upgradeRequired: true }, { status: 402 });
}
