import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";
import { accessExpired } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["single", "multi"]).default("single"),
  required: z.boolean().default(false),
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        priceDelta: z.number().min(-10000).max(10000).default(0),
      })
    )
    .min(1)
    .max(30),
});

/** Add an option group ("Size", "Toppings") with its choices to a dish. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const expired = accessExpired(user);
  if (expired) return expired;
  const item = await prisma.menuItem.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
  if (!item) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const count = await prisma.modifierGroup.count({ where: { itemId: id } });
  const group = await prisma.modifierGroup.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      required: parsed.data.required,
      sortOrder: count,
      itemId: id,
      options: {
        create: parsed.data.options.map((o, i) => ({ ...o, sortOrder: i })),
      },
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  return Response.json({ group }, { status: 201 });
}
