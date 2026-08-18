import { z } from "zod";
import { isMenuTheme } from "@/lib/menu-themes";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

async function ownedRestaurant(req: Request, id: string) {
  const user = await getAuthUser(req);
  if (!user) return null;
  return prisma.restaurant.findFirst({ where: { id, ownerId: user.id } });
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const restaurant = await ownedRestaurant(req, id);
  if (!restaurant) return notFound();
  const full = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              modifierGroups: {
                orderBy: { sortOrder: "asc" },
                include: { options: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });
  return Response.json({ restaurant: full });
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  caption: z.string().max(160).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
  currency: z.string().max(8).optional(),
  accentColor: z.string().max(16).optional(),
  // Any template defined in src/lib/menu-themes.ts — no enum to keep in sync.
  theme: z.string().refine(isMenuTheme, "Unknown template").optional(),
  layout: z.enum(["list", "grid"]).optional(),
  showReel: z.boolean().optional(),
  logoUrl: z.string().max(500).optional(),
  coverUrl: z.string().max(500).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;
  const restaurant = await ownedRestaurant(req, id);
  if (!restaurant) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const updated = await prisma.restaurant.update({
    where: { id },
    data: parsed.data,
  });
  return Response.json({ restaurant: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const restaurant = await ownedRestaurant(req, id);
  if (!restaurant) return notFound();
  await prisma.restaurant.delete({ where: { id } });
  return Response.json({ ok: true });
}
