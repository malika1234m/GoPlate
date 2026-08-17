import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/ratelimit";

const schema = z.object({
  subject: z.string().min(3).max(150),
  body: z.string().min(10).max(4000),
});

/**
 * "Something is wrong" from an owner. No `accessExpired` guard: a lapsed
 * account is precisely the one most likely to need help, and a billing problem
 * would otherwise be unreportable.
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  if (!rateLimit(`support:${user.id}`, 5, 60 * 60_000)) {
    return tooManyRequests("You've sent several messages already. We'll reply soon.");
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Add a subject and describe the problem in a sentence or two." },
      { status: 400 }
    );
  }

  const created = await prisma.supportMessage.create({
    data: { userId: user.id, subject: parsed.data.subject, body: parsed.data.body },
  });

  return Response.json(
    { message: { id: created.id, status: created.status, createdAt: created.createdAt } },
    { status: 201 }
  );
}

/** The owner's own thread list, so they can see replies. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const messages = await prisma.supportMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      subject: true,
      body: true,
      status: true,
      reply: true,
      repliedAt: true,
      createdAt: true,
    },
  });

  return Response.json({ messages });
}
