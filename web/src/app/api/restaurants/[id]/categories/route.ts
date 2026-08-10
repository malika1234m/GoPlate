import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  name: z.string().min(1).max(80),
  sortOrder: z.number().int().optional(),
  availableFrom: z.string().regex(TIME).or(z.literal("")).optional(),
  availableTo: z.string().regex(TIME).or(z.literal("")).optional(),
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
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await prisma.category.count({ where: { restaurantId: id } });
  const category = await prisma.category.create({
    data: {
      ...parsed.data,
      sortOrder: parsed.data.sortOrder ?? count,
      restaurantId: id,
    },
  });
  return Response.json({ category }, { status: 201 });
}
