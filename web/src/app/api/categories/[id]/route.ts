import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

async function ownedCategory(req: Request, id: string) {
  const user = await getAuthUser(req);
  if (!user) return null;
  return prisma.category.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  sortOrder: z.number().int().optional(),
  availableFrom: z.string().regex(TIME).or(z.literal("")).optional(),
  availableTo: z.string().regex(TIME).or(z.literal("")).optional(),
  /** Move between sections, or null to promote back to a top-level section. */
  parentId: z.string().min(1).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();
  const expired = accessExpired(authUser);
  if (expired) return expired;
  const { id } = await params;
  const category = await ownedCategory(req, id);
  if (!category) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { parentId } = parsed.data;
  if (parentId !== undefined && parentId !== null) {
    if (parentId === id) {
      return Response.json({ error: "A section can't sit inside itself." }, { status: 400 });
    }
    const parent = await prisma.category.findFirst({
      where: { id: parentId, restaurantId: category.restaurantId },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      return Response.json({ error: "That section doesn't exist." }, { status: 400 });
    }
    if (parent.parentId) {
      return Response.json(
        { error: "Sub-sections can't be nested any deeper." },
        { status: 400 }
      );
    }
    // Moving a section that already has sub-sections under another section
    // would create a third level. Refuse rather than silently flattening.
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      return Response.json(
        { error: "Move or remove this section's sub-sections first." },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });
  return Response.json({ category: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const category = await ownedCategory(req, id);
  if (!category) return notFound();
  await prisma.category.delete({ where: { id } });
  return Response.json({ ok: true });
}
