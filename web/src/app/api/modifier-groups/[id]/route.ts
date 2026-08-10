import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

async function ownedGroup(req: Request, id: string) {
  const user = await getAuthUser(req);
  if (!user) return null;
  return prisma.modifierGroup.findFirst({
    where: { id, item: { restaurant: { ownerId: user.id } } },
  });
}

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.enum(["single", "multi"]).optional(),
  required: z.boolean().optional(),
  // When provided, replaces the full option list
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        priceDelta: z.number().min(-10000).max(10000).default(0),
      })
    )
    .min(1)
    .max(30)
    .optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();
  const expired = accessExpired(authUser);
  if (expired) return expired;
  const { id } = await params;
  const group = await ownedGroup(req, id);
  if (!group) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { options, ...fields } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (options) {
      await tx.modifierOption.deleteMany({ where: { groupId: id } });
      await tx.modifierOption.createMany({
        data: options.map((o, i) => ({ ...o, sortOrder: i, groupId: id })),
      });
    }
    return tx.modifierGroup.update({
      where: { id },
      data: fields,
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
  });
  return Response.json({ group: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const group = await ownedGroup(req, id);
  if (!group) return notFound();
  await prisma.modifierGroup.delete({ where: { id } });
  return Response.json({ ok: true });
}
