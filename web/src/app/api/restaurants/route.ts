import { z } from "zod";
import { isMenuTheme } from "@/lib/menu-themes";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { uniqueSlug } from "@/lib/slug";
import { PLANS, planOf, upgradeRequired, accessExpired } from "@/lib/plans";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true, categories: true } } },
  });
  return Response.json({ restaurants });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
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
});

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const plan = planOf(user);
  const count = await prisma.restaurant.count({ where: { ownerId: user.id } });
  if (count >= PLANS[plan].maxRestaurants) {
    return upgradeRequired(
      plan === "pro"
        ? "You have reached the maximum number of restaurants on your plan."
        : `The ${PLANS[plan].label} plan includes one restaurant. Upgrade to Pro to add more.`
    );
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      ...parsed.data,
      slug: await uniqueSlug(parsed.data.name),
      ownerId: user.id,
    },
  });
  return Response.json({ restaurant }, { status: 201 });
}
