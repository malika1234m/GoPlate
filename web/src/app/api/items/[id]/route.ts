import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { PLANS, planOf, upgradeRequired, countVideos, withinLimit, accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

async function ownedItem(req: Request, id: string) {
  const user = await getAuthUser(req);
  if (!user) return null;
  return prisma.menuItem.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
}

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  caption: z.string().max(160).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().optional(),
  imageUrl: z.string().max(500).optional(),
  videoUrl: z.string().max(500).optional(),
  storyVideoUrl: z.string().max(500).optional(),
  categoryId: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  soldOutToday: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/** Local date as YYYY-MM-DD — sold-out flags auto-expire at midnight. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const item = await ownedItem(req, id);
  if (!item) return notFound();
  const full = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      // The editor shows prices and add-on deltas, so it needs the currency
      // without a second round-trip for the whole restaurant.
      restaurant: { select: { currency: true } },
      modifierGroups: {
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  return Response.json({ item: full });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;
  const item = await ownedItem(req, id);
  if (!item) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, restaurantId: item.restaurantId },
    });
    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }
  }
  // Attaching a video to a dish that had none counts against the plan.
  if (parsed.data.videoUrl && !item.videoUrl && !item.storyVideoUrl) {
    {
      const plan = PLANS[planOf(user)];
      if (plan.maxVideos === 0) {
        return upgradeRequired("Menu videos are available on Starter and Pro.");
      }
      const used = await countVideos(user.id);
      if (!withinLimit(plan.maxVideos, used)) {
        return upgradeRequired(
          `Your ${plan.label} plan includes ${plan.maxVideos} dish videos and you've used ${used}. Remove a video from another dish, or upgrade for more.`
        );
      }
    }
  }

  const { soldOutToday, ...data } = parsed.data;
  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      ...data,
      ...(soldOutToday !== undefined && { soldOutDate: soldOutToday ? today() : "" }),
    },
  });
  return Response.json({ item: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const item = await ownedItem(req, id);
  if (!item) return notFound();
  await prisma.menuItem.delete({ where: { id } });
  return Response.json({ ok: true });
}
