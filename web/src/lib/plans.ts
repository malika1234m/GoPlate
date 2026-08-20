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
    /**
     * Yearly price: ten months for twelve, i.e. two months free. Stored rather
     * than derived so a promotion can move one plan without a magic multiplier
     * spreading through the pricing page, the request form and the admin totals.
     */
    priceYearlyUsd: number;
    maxRestaurants: number;
    /**
     * How many dishes may carry a 3D model / video at once. This is the number
     * the pricing page sells: "2 photoreal 3D models" means two dishes in 3D.
     */
    maxModels: number;
    maxVideos: number;
    /**
     * How many may be *generated* per calendar month. Separate from the caps
     * above because those limit inventory and this limits spend: regenerating
     * a dish, or deleting one and building another, costs us a paid call to
     * the 3D provider every time while leaving the inventory count unchanged.
     * Set comfortably above the inventory cap so redoing a model you dislike
     * is normal, and only sustained abuse hits the ceiling.
     */
    modelsPerMonth: number;
    videosPerMonth: number;
  }
> = {
  basic: {
    label: "Basic", priceLabel: "$2/mo", priceUsd: 2, priceYearlyUsd: 20,
    maxRestaurants: 1, maxModels: 2, maxVideos: 2, modelsPerMonth: 6, videosPerMonth: 6,
  },
  starter: {
    label: "Starter", priceLabel: "$12/mo", priceUsd: 12, priceYearlyUsd: 120,
    maxRestaurants: 1, maxModels: 10, maxVideos: 10, modelsPerMonth: 25, videosPerMonth: 25,
  },
  // Pro was "unlimited". A 200-dish menu meant 200 paid generations and an
  // open-ended transcode bill against $29/month, so it is now a ceiling high
  // enough that no real restaurant reaches it — a 100-dish menu is still
  // "your entire menu in 3D" — while capping what a single account can cost.
  pro: {
    label: "Pro", priceLabel: "$29/mo", priceUsd: 29, priceYearlyUsd: 290,
    maxRestaurants: 10, maxModels: 100, maxVideos: 100, modelsPerMonth: 150, videosPerMonth: 150,
  },
};

export const PLAN_IDS: Plan[] = ["basic", "starter", "pro"];

export type BillingPeriod = "monthly" | "yearly";

/** What an owner pays today for a given plan and period. */
export function priceFor(plan: Plan, period: BillingPeriod): number {
  return period === "yearly" ? PLANS[plan].priceYearlyUsd : PLANS[plan].priceUsd;
}

/**
 * Headline saving, rounded down so the marketing claim is never larger than
 * the real discount. At ten-months-for-twelve this reads "Save 16%".
 */
export function yearlySavingPercent(plan: Plan = "starter"): number {
  const full = PLANS[plan].priceUsd * 12;
  return Math.floor(((full - PLANS[plan].priceYearlyUsd) / full) * 100);
}

/**
 * Ordering used to gate features that get richer as the plan does.
 * Kept as a number rather than comparing plan names so a new tier slots in
 * without rewriting every comparison.
 */
export const PLAN_TIER: Record<Plan, number> = { basic: 0, starter: 1, pro: 2 };

/**
 * Free choice of accent colour is a paid feature — and a quality control.
 * On Basic the accent follows the template, which stops a menu going out in
 * neon magenta on a black background and looking like nobody designed it.
 */
export function canCustomiseAccent(plan: Plan): boolean {
  return PLAN_TIER[plan] >= PLAN_TIER.starter;
}

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

/* ---------------- Monthly generation allowance ---------------- */

export type UsageKind = "model" | "video";

/**
 * Start of the current allowance window: midnight UTC on the 1st.
 * A calendar month rather than a rolling 30 days because an owner has to be
 * able to predict it — "6 this month, resets on the 1st" is something support
 * can say in one sentence, and it does not depend on when they subscribed
 * (which, while billing is still manual, we do not reliably know).
 */
export function allowanceWindowStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** How many of `kind` this owner has spent in the current window. */
export async function countGenerationsThisMonth(
  ownerId: string,
  kind: UsageKind
): Promise<number> {
  return prisma.usageEvent.count({
    where: { userId: ownerId, kind, createdAt: { gte: allowanceWindowStart() } },
  });
}

/**
 * Record a spend. Deliberately called *after* the provider accepted the job,
 * so a failure on their side does not burn the owner's allowance — we would
 * rather under-count than charge someone for something that never ran.
 */
export async function recordGeneration(
  ownerId: string,
  kind: UsageKind,
  itemId = ""
): Promise<void> {
  await prisma.usageEvent.create({ data: { userId: ownerId, kind, itemId } });
}

/** Days until the allowance resets, for the "try again on the 1st" message. */
export function daysUntilAllowanceReset(now: Date = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 86_400_000));
}

/** 402 Payment Required with a consistent shape the mobile app understands. */
export function upgradeRequired(message: string) {
  return Response.json({ error: message, upgradeRequired: true }, { status: 402 });
}
