import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { uploadsDir } from "@/lib/uploads";

/**
 * Serves uploaded media at /uploads/<file>. Files live outside `public/`
 * because Next only serves public/ assets that existed at build time.
 */

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".glb": "model/gltf-binary",
  ".usdz": "model/vnd.usdz+zip",
};

// Hex-key filenames only — no traversal, no surprises.
const SAFE_NAME = /^[a-z0-9-]+\.[a-z0-9]+$/i;

/**
 * Payment slips share this directory but must never be served here: they show
 * bank details and belong only to a signed-in admin, via
 * /api/admin/requests/[id]/slip. Their names are unguessable, but a random name
 * is obscurity, not access control — one leaked filename (a log line, a backup,
 * a future endpoint that returns it) would otherwise be enough to read it.
 */
const PRIVATE_PREFIX = "slip-";

type Params = { params: Promise<{ name: string }> };

export async function GET(req: Request, { params }: Params) {
  const { name } = await params;
  const ext = path.extname(name).toLowerCase();
  const mime = MIME[ext];
  if (!SAFE_NAME.test(name) || !mime || name.startsWith(PRIVATE_PREFIX)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(uploadsDir(), name);
  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const size = statSync(filePath).size;
  const range = req.headers.get("range");

  // Range support so videos seek/stream properly on phones
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start <= end && start < size) {
        const stream = createReadStream(filePath, { start, end });
        return new Response(Readable.toWeb(stream) as ReadableStream, {
          status: 206,
          headers: {
            "Content-Type": mime,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
