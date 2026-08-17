import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { uploadsDir } from "@/lib/uploads";
import { optimizeImage } from "@/lib/media-optimize";
import { isPlan, PLANS } from "@/lib/plans";
import { rateLimit, tooManyRequests } from "@/lib/ratelimit";

const MAX_SLIP_BYTES = 10 * 1024 * 1024;
const SLIP_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

/**
 * An owner asks to be moved onto a paid plan, attaching proof of a bank
 * transfer. Used while payment is still manual.
 *
 * Note there is no `accessExpired` guard here, unlike every other mutating
 * route: the owners who most need this are exactly the ones whose free month
 * has run out. Blocking them would make upgrading impossible.
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  if (!rateLimit(`upgradereq:${user.id}`, 5, 60 * 60_000)) {
    return tooManyRequests("You've sent several requests already. We'll be in touch shortly.");
  }

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Invalid request" }, { status: 400 });

  const requestedPlan = String(form.get("plan") ?? "");
  if (!isPlan(requestedPlan)) {
    return Response.json({ error: "Choose a plan." }, { status: 400 });
  }

  const amount = Number(form.get("amount") ?? 0);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000) {
    return Response.json({ error: "Enter the amount you paid." }, { status: 400 });
  }

  const note = String(form.get("note") ?? "").slice(0, 1000);
  const currency = String(form.get("currency") ?? "USD").slice(0, 8).toUpperCase();

  // One open request at a time, so the review queue can't be flooded and the
  // owner isn't left wondering which of three requests is being looked at.
  const existing = await prisma.upgradeRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (existing) {
    return Response.json(
      { error: "You already have a request being reviewed. We'll email you when it's done." },
      { status: 409 }
    );
  }

  let slipFile = "";
  const file = form.get("slip");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SLIP_BYTES) {
      return Response.json({ error: "Slip is too large (max 10 MB)." }, { status: 413 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!SLIP_EXTS.includes(ext)) {
      return Response.json(
        { error: "Attach the slip as a JPG, PNG, WebP or PDF." },
        { status: 415 }
      );
    }

    let bytes: Uint8Array = Buffer.from(await file.arrayBuffer());
    let outExt = ext;
    // Photographed slips are full-size camera images; shrink them like any
    // other upload. PDFs pass through untouched.
    if (ext !== ".pdf") {
      const optimized = await optimizeImage(bytes, ext);
      bytes = optimized.bytes;
      outExt = optimized.ext;
    }

    // "slip-" prefix so these are identifiable on disk, and a full-length random
    // name because the file is sensitive: guessing it must be infeasible even
    // though the only reader is the admin-only route.
    slipFile = `slip-${crypto.randomBytes(24).toString("hex")}${outExt}`;
    const dir = uploadsDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, slipFile), bytes);
  }

  const created = await prisma.upgradeRequest.create({
    data: {
      userId: user.id,
      requestedPlan,
      amount,
      currency,
      note,
      slipFile,
    },
  });

  return Response.json(
    {
      request: {
        id: created.id,
        requestedPlan: created.requestedPlan,
        planLabel: PLANS[requestedPlan].label,
        status: created.status,
        createdAt: created.createdAt,
      },
    },
    { status: 201 }
  );
}

/** The owner's own request history, for the status shown on /account. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const requests = await prisma.upgradeRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      requestedPlan: true,
      amount: true,
      currency: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
      // slipFile is deliberately not returned — nothing in the owner UI needs
      // the filename, and not sending it keeps the only reference server-side.
    },
  });

  return Response.json({ requests });
}
