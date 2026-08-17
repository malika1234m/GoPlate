import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

/** Owner problem reports. Defaults to OPEN — the ones still needing an answer. */
export async function GET(req: Request) {
  const { deny } = await requireAdmin(req);
  if (deny) return deny;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "OPEN").toUpperCase();
  const where = status === "ALL" ? {} : { status };

  const rows = await prisma.supportMessage.findMany({
    where,
    orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
    take: 200,
    include: {
      user: {
        select: { id: true, name: true, email: true, plan: true, stripeSubscriptionId: true },
      },
      handledBy: { select: { name: true } },
    },
  });

  return Response.json({
    messages: rows.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      status: m.status,
      reply: m.reply,
      repliedAt: m.repliedAt,
      handledBy: m.handledBy?.name ?? null,
      createdAt: m.createdAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        // Shown next to the message so whoever answers knows straight away
        // whether they are talking to a paying customer.
        plan: m.user.plan,
        paying: m.user.stripeSubscriptionId !== "",
      },
    })),
  });
}
