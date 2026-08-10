import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * Returns the restaurant's menu QR code as a PNG (?format=png, default)
 * or as a data URL JSON payload (?format=json) for display in the mobile app.
 */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) return notFound();

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const menuUrl = `${base}/r/${restaurant.slug}`;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "json") {
    const dataUrl = await QRCode.toDataURL(menuUrl, { width: 512, margin: 2 });
    return Response.json({ menuUrl, qrDataUrl: dataUrl });
  }

  const png = await QRCode.toBuffer(menuUrl, { width: 1024, margin: 2 });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${restaurant.slug}-menu-qr.png"`,
    },
  });
}
