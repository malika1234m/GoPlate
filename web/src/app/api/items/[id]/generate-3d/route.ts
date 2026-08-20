import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { gen3dEnabled, startGeneration, checkGeneration } from "@/lib/gen3d";
import { saveFromUrl } from "@/lib/uploads";
import {
  PLANS,
  planOf,
  upgradeRequired,
  countModels,
  withinLimit,
  accessExpired,
  countGenerationsThisMonth,
  recordGeneration,
  daysUntilAllowanceReset,
} from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

async function ownedItem(req: Request, id: string) {
  const user = await getAuthUser(req);
  if (!user) return null;
  return prisma.menuItem.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
}

/** Start 3D model generation for a menu item from its photo. Pro feature. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;
  const item = await ownedItem(req, id);
  if (!item) return notFound();

  const plan = PLANS[planOf(user)];
  if (plan.maxModels === 0) {
    return upgradeRequired(
      "3D models are available on Starter and Pro. Upgrade to turn your dish photos into spinnable 3D models."
    );
  }
  // Two different limits, because they protect two different things.
  //
  // The inventory cap is what the plan sells: how many dishes may show in 3D
  // at once. Regenerating a dish that already has a model doesn't consume a
  // new slot — the menu still shows the same number of 3D dishes.
  if (item.modelStatus !== "READY" && item.modelStatus !== "PROCESSING") {
    const used = await countModels(user.id);
    if (!withinLimit(plan.maxModels, used)) {
      return upgradeRequired(
        `Your ${plan.label} plan shows ${plan.maxModels} dishes in 3D and you've used ${used}. ` +
          `Remove a 3D model from another dish, or upgrade for more.`
      );
    }
  }

  // The monthly allowance protects what a generation actually costs us, and so
  // it applies to *every* run — including regenerating a dish that already has
  // a model, which is exactly the case the inventory cap above lets through.
  const spent = await countGenerationsThisMonth(user.id, "model");
  if (!withinLimit(plan.modelsPerMonth, spent)) {
    return upgradeRequired(
      `You've built ${spent} 3D models this month, the most your ${plan.label} plan allows. ` +
        `Your allowance resets in ${daysUntilAllowanceReset()} day(s), or upgrade for a bigger one.`
    );
  }

  if (!gen3dEnabled()) {
    return Response.json(
      {
        error:
          "3D generation is not configured on this server (MESHY_API_KEY missing). " +
          "The menu will show the interactive 360° video instead.",
        enabled: false,
      },
      { status: 503 }
    );
  }
  if (!item.imageUrl) {
    return Response.json(
      { error: "Add a photo of the dish first — it is used to build the 3D model." },
      { status: 400 }
    );
  }

  // The generation service must be able to fetch the image over the internet.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const imageUrl = item.imageUrl.startsWith("http")
    ? item.imageUrl
    : `${base}${item.imageUrl}`;

  try {
    const jobId = await startGeneration(imageUrl);
    // Only now, once the provider has accepted the job and we are committed to
    // paying for it, does this count against the owner's allowance.
    await recordGeneration(user.id, "model", id);
    const updated = await prisma.menuItem.update({
      where: { id },
      data: { modelStatus: "PROCESSING", modelJobId: jobId },
    });
    return Response.json({ item: updated });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 }
    );
  }
}

/** Poll generation status; updates the item when the model is ready. */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const item = await ownedItem(req, id);
  if (!item) return notFound();

  if (item.modelStatus !== "PROCESSING" || !item.modelJobId) {
    return Response.json({ item });
  }

  const result = await checkGeneration(item.modelJobId);
  if (result.status === "READY") {
    // Copy the models into our own storage — the provider's URLs expire.
    // Fall back to the provider URL if a download fails; the menu still
    // works today and the next regeneration can fix it.
    let modelUrl = result.modelUrl;
    let usdzUrl = result.usdzUrl;
    if (modelUrl) modelUrl = await saveFromUrl(modelUrl, ".glb").catch(() => result.modelUrl);
    if (usdzUrl) usdzUrl = await saveFromUrl(usdzUrl, ".usdz").catch(() => result.usdzUrl);

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        modelStatus: "READY",
        modelUrl,
        modelUsdzUrl: usdzUrl,
      },
    });
    return Response.json({ item: updated });
  }
  if (result.status === "FAILED") {
    const updated = await prisma.menuItem.update({
      where: { id },
      data: { modelStatus: "FAILED" },
    });
    return Response.json({ item: updated, error: result.error });
  }
  return Response.json({ item, progress: result.progress });
}

/** Remove the dish's 3D model — frees the plan slot. Files stay on disk (harmless orphans). */
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const item = await ownedItem(req, id);
  if (!item) return notFound();

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { modelStatus: "NONE", modelUrl: "", modelUsdzUrl: "", modelJobId: "" },
  });
  return Response.json({ item: updated });
}
