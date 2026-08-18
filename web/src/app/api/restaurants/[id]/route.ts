import { z } from "zod";
import { isMenuTheme, canUseTheme, themeOf } from "@/lib/menu-themes";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { accessExpired, planOf, canCustomiseAccent, upgradeRequired } from "@/lib/plans";

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
  /**
   * Template and accent are plan-gated, and the check has to live here rather
   * than only in the picker: the picker greys options out, but the API is what
   * actually stops a hand-rolled request from taking a paid template for free.
   */
  const plan = planOf(user);
  const { theme, accentColor } = parsed.data;

  /**
   * Only a *change* is gated. Both clients send the whole settings form on
   * every save, so checking the value alone would trap an owner who downgraded
   * while on a paid template: each save would resend their current theme, get a
   * 402, and they could never edit their phone number again. Downgrading keeps
   * the look they had; it just stops them picking another paid one.
   */
  if (theme && theme !== restaurant.theme && !canUseTheme(plan, theme)) {
    return upgradeRequired(
      `The ${themeOf(theme).label} template is part of Starter. Upgrade to use it — your menu keeps its current look until then.`
    );
  }
  if (
    accentColor &&
    accentColor.toLowerCase() !== restaurant.accentColor.toLowerCase() &&
    !canCustomiseAccent(plan)
  ) {
    return upgradeRequired(
      "Choosing your own accent colour is part of Starter. On Basic the colour follows the template you pick."
    );
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
