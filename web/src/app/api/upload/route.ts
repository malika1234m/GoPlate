import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { accessExpired } from "@/lib/plans";
import { uploadsDir } from "@/lib/uploads";

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
  const filename = `${crypto.randomBytes(12).toString("hex")}${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return Response.json({ url: `/uploads/${filename}` }, { status: 201 });
}
