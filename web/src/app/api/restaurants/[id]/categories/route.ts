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
  /** Makes this a sub-section of another section, e.g. Kottu inside Mains. */
  parentId: z.string().min(1).nullable().optional(),
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

  const { parentId } = parsed.data;

  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, restaurantId: id },
      select: { id: true, parentId: true },
    });
    // Must belong to this restaurant — otherwise a section could be nested
    // under someone else's menu.
    if (!parent) {
      return Response.json({ error: "That section doesn't exist." }, { status: 400 });
    }
    // Two levels only. A diner at a table will not navigate a deeper tree,
    // and the menu renderer draws exactly section → sub-section.
    if (parent.parentId) {
      return Response.json(
        { error: "Sub-sections can't be nested any deeper. Add this inside a top-level section." },
        { status: 400 }
      );
    }
  }

  // Order within the group being added to, so a new sub-section lands at the
  // bottom of its own parent rather than the bottom of the whole menu.
  const count = await prisma.category.count({
    where: { restaurantId: id, parentId: parentId ?? null },
  });
  const category = await prisma.category.create({
    data: {
      ...parsed.data,
      sortOrder: parsed.data.sortOrder ?? count,
      restaurantId: id,
    },
  });
  return Response.json({ category }, { status: 201 });
}
