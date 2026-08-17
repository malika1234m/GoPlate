import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { uploadsDir } from "@/lib/uploads";

/**
 * Serves a payment slip to a signed-in admin, and nobody else.
 *
 * Slips are not exposed through /uploads/[name] because that route serves any
 * filename it is handed, to anyone. A bank slip shows account numbers and a
 * person's name; it needs an authenticated reader.
 *
 * The console fetches this with its Bearer token and renders the result from a
 * blob URL — an <img src> cannot send an Authorization header, so linking
 * directly to this path would not work even for an admin.
 */

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const SAFE_NAME = /^slip-[a-f0-9]+\.[a-z0-9]+$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { deny } = await requireAdmin(req);
  if (deny) return deny;

  const { id } = await params;
  const request = await prisma.upgradeRequest.findUnique({
    where: { id },
    select: { slipFile: true },
  });
  if (!request?.slipFile) {
    return new Response("Not found", { status: 404 });
  }

  // The name comes from our own writer, but validate anyway — a bad row must
  // not turn into a path traversal.
  if (!SAFE_NAME.test(request.slipFile)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(request.slipFile).toLowerCase();
  const mime = MIME[ext];
  const filePath = path.join(uploadsDir(), request.slipFile);
  if (!mime || !existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(statSync(filePath).size),
      // Never cached by a proxy, never stored on disk by the browser.
      "Cache-Control": "private, no-store",
    },
  });
}
