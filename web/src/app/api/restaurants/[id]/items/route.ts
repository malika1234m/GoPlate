import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { PLANS, planOf, upgradeRequired, countVideos, withinLimit, accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  caption: z.string().max(160).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative(),
  imageUrl: z.string().max(500).optional(),
  videoUrl: z.string().max(500).optional(),
  isVegetarian: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { categoryId, ...data } = parsed.data;

  if (data.videoUrl) {
    const plan = PLANS[planOf(user)];
    if (plan.maxVideos === 0) {
      return upgradeRequired("Menu videos are available on Starter and Pro.");
    }
    const used = await countVideos(user.id);
    if (!withinLimit(plan.maxVideos, used)) {
      return upgradeRequired(
        `Your ${plan.label} plan includes ${plan.maxVideos} dish videos and you've used ${used}. Upgrade to Pro for unlimited videos.`
      );
    }
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, restaurantId: id },
  });
  if (!category) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }

  const count = await prisma.menuItem.count({ where: { categoryId } });
  const item = await prisma.menuItem.create({
    data: { ...data, categoryId, restaurantId: id, sortOrder: count },
  });
  return Response.json({ item }, { status: 201 });
}
