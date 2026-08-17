import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { appUrl, emailConfigured, sendEmail, supportReplyEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  reply: z.string().max(4000).optional(),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
});

/** Answer a report and/or close it. */
export async function PATCH(req: Request, { params }: Params) {
  const { admin, deny } = await requireAdmin(req);
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const { reply, status } = parsed.data;
  if (reply === undefined && status === undefined) {
    return Response.json({ error: "Nothing to change." }, { status: 400 });
  }

  const message = await prisma.supportMessage.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!message) return Response.json({ error: "Not found" }, { status: 404 });

  const sendsReply = typeof reply === "string" && reply.trim().length > 0;

  const updated = await prisma.supportMessage.update({
    where: { id },
    data: {
      ...(sendsReply ? { reply: reply.trim(), repliedAt: new Date() } : {}),
      ...(status ? { status } : {}),
      handledById: admin!.id,
    },
  });

  // The owner has no reason to keep checking the site for an answer.
  if (sendsReply && emailConfigured()) {
    try {
      await sendEmail(
        supportReplyEmail({
          to: message.user.email,
          name: message.user.name,
          subject: message.subject,
          reply: reply!.trim(),
          accountUrl: `${appUrl()}/account`,
        })
      );
    } catch (err) {
      console.error("Support reply email failed:", err);
    }
  }

  return Response.json({ message: { id: updated.id, status: updated.status } });
}
