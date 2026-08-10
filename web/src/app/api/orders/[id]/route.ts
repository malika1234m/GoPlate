import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["NEW", "PREPARING", "DONE", "CANCELLED"]),
});

/** Move an order through the kitchen flow (owner only). */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const order = await prisma.order.findFirst({
    where: { id, restaurant: { ownerId: user.id } },
  });
  if (!order) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return Response.json({ order: { id: updated.id, status: updated.status } });
}
