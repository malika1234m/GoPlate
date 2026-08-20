import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getAuthUser, unauthorized } from "@/lib/auth";
import {
  PLANS,
  accessExpired,
  countGenerationsThisMonth,
  daysUntilAllowanceReset,
  planOf,
  recordGeneration,
  upgradeRequired,
  withinLimit,
} from "@/lib/plans";
import { uploadsDir } from "@/lib/uploads";
import { optimizeGlb } from "@/lib/model-optimize";
import { optimizeImage, optimizeVideoInPlace } from "@/lib/media-optimize";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXTS = [".mp4", ".mov", ".webm"];

/**
 * Media upload (dish photos and videos) from the mobile app.
 * Files are stored in the local `uploads/` directory (outside `public/`, which
 * Next snapshots at build time) and streamed back via the /uploads/[name]
 * route. For production on Vercel, swap this for Vercel Blob or S3 — the
 * client contract stays the same.
 */

// 200 MB: a 60-second 1080p phone capture (the app's 360° limit) commonly
// lands at 75–130 MB, so 100 MB rejected legitimate films. Matches the
// story-video route's cap.
const MAX_BYTES = 200 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "model/gltf-binary": ".glb",
};

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large (max 200 MB)" }, { status: 413 });
  }

  let ext = ALLOWED[file.type];
  if (!ext) {
    // Some Android camera apps send generic types; fall back to the filename extension.
    const nameExt = path.extname(file.name).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm", ".glb"].includes(nameExt)) {
      ext = nameExt;
    } else {
      return Response.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
    }
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  let bytes: Uint8Array = Buffer.from(await file.arrayBuffer());

  // A hand-uploaded model gets the same treatment as a generated one — an
  // owner exporting from Blender or Meshy has no reason to know about Draco.
  if (ext === ".glb") bytes = await optimizeGlb(bytes);

  // Photos re-encode fast enough to do before responding, and may change
  // extension in the process (JPEG in, WebP out).
  if (IMAGE_EXTS.includes(ext)) {
    const optimized = await optimizeImage(bytes, ext);
    bytes = optimized.bytes;
    ext = optimized.ext;
  }

  // Metered here rather than where a video is attached to a dish, because the
  // cost is the transcode below — it happens whether or not the clip ever ends
  // up on the menu, so gating only on attachment leaves the CPU bill open.
  if (VIDEO_EXTS.includes(ext)) {
    const plan = PLANS[planOf(user)];
    const spent = await countGenerationsThisMonth(user.id, "video");
    if (!withinLimit(plan.videosPerMonth, spent)) {
      return upgradeRequired(
        `You've uploaded ${spent} dish videos this month, the most your ${plan.label} plan allows. ` +
          `Your allowance resets in ${daysUntilAllowanceReset()} day(s), or upgrade for a bigger one.`
      );
    }
  }

  const filename = `${crypto.randomBytes(12).toString("hex")}${ext}`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, bytes);

  // Video is transcoded after the response: a 100 MB clip takes tens of
  // seconds, and making the phone wait risks it timing out and losing the
  // upload. The file is replaced in place, so this URL stays correct either way.
  if (VIDEO_EXTS.includes(ext)) {
    await recordGeneration(user.id, "video");
    optimizeVideoInPlace(filePath);
  }

  return Response.json({ url: `/uploads/${filename}` }, { status: 201 });
}
