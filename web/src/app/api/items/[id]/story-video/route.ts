import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { autoEditVideo } from "@/lib/video";
import { uploadsDir } from "@/lib/uploads";
import { PLANS, planOf, upgradeRequired, countVideos, withinLimit, accessExpired } from "@/lib/plans";

export const maxDuration = 300; // video processing can take a while

type Params = { params: Promise<{ id: string }> };

/**
 * Upload a raw "how it's made" video. The server auto-edits it
 * (speed-up, trim, 720p, fade) and attaches the result to the dish.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;
  const item = await prisma.menuItem.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
  if (!item) return notFound();

  const plan = PLANS[planOf(user)];
  if (plan.maxVideos === 0) {
    return upgradeRequired(
      "Menu videos are available on Starter and Pro. Upgrade to bring your dishes to life."
    );
  }
  // Replacing this dish's existing video doesn't consume a new slot.
  if (!item.videoUrl && !item.storyVideoUrl) {
    const used = await countVideos(user.id);
    if (!withinLimit(plan.maxVideos, used)) {
      return upgradeRequired(
        `Your ${plan.label} plan includes ${plan.maxVideos} dish videos and you've used ${used}. Remove a video from another dish, or upgrade for more.`
      );
    }
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No video provided" }, { status: 400 });
  }
  if (file.size > 200 * 1024 * 1024) {
    return Response.json({ error: "Video too large (max 200 MB)" }, { status: 413 });
  }

  // Only accept actual video uploads — this endpoint feeds ffmpeg.
  const VIDEO_EXTS = [".mp4", ".mov", ".webm", ".m4v", ".3gp"];
  const rawExt = path.extname(file.name).toLowerCase() || ".mp4";
  const looksLikeVideo = file.type.startsWith("video/") || VIDEO_EXTS.includes(rawExt);
  if (!looksLikeVideo || (rawExt && !VIDEO_EXTS.includes(rawExt))) {
    return Response.json({ error: "Unsupported video format" }, { status: 415 });
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const key = crypto.randomBytes(12).toString("hex");
  const rawPath = path.join(dir, `raw-${key}${rawExt}`);
  const outName = `story-${key}.mp4`;
  const outPath = path.join(dir, outName);

  await writeFile(rawPath, Buffer.from(await file.arrayBuffer()));

  try {
    await autoEditVideo(rawPath, outPath);
  } catch {
    // Corrupt clip or undecodable codec. Attaching the raw file would put a
    // dead video on the customer menu — fail loudly so the owner refilms.
    await unlink(rawPath).catch(() => {});
    await unlink(outPath).catch(() => {});
    return Response.json(
      { error: "We couldn't process that video. Try filming again, or pick a different clip." },
      { status: 422 }
    );
  }
  await unlink(rawPath).catch(() => {});

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { storyVideoUrl: `/uploads/${outName}` },
  });
  return Response.json({ item: updated, edited: true }, { status: 201 });
}

/** Remove the story video from a dish. */
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const item = await prisma.menuItem.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
  if (!item) return notFound();
  const updated = await prisma.menuItem.update({
    where: { id },
    data: { storyVideoUrl: "" },
  });
  return Response.json({ item: updated });
}
