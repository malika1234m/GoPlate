import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized, notFound } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** The restaurant's orders, newest first — powers the app's Orders screen. */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  const restaurant = await prisma.restaurant.findFirst({ where: { id, ownerId: user.id } });
  if (!restaurant) return notFound();

  const orders = await prisma.order.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({
    orders: orders.map((o) => ({
      id: o.id,
      code: o.id.slice(-4).toUpperCase(),
      tableNumber: o.tableNumber,
      customerName: o.customerName,
      note: o.note,
      status: o.status,
      items: JSON.parse(o.items) as unknown,
      total: o.total,
      createdAt: o.createdAt,
    })),
  });
}
