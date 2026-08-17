import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { PLANS, type Plan } from "@/lib/plans";
import { appUrl, emailConfigured, sendEmail, upgradeDecisionEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(1000).optional(),
});

/**
 * Approve or reject a request after looking at the slip.
 *
 * Approving is what actually applies the plan — the two happen in one
 * transaction so an approved request can never be recorded without the
 * customer's account changing, which is the state that would show revenue for
 * an upgrade the owner never received.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { admin, deny } = await requireAdmin(req);
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { decision, reviewNote = "" } = parsed.data;

  const request = await prisma.upgradeRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request) return Response.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    // Two admins with the queue open should not be able to double-apply a plan.
    return Response.json(
      { error: `This request was already ${request.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.upgradeRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewNote,
        reviewedAt: new Date(),
        reviewedById: admin!.id,
      },
    });

    if (decision === "APPROVED") {
      await tx.user.update({
        where: { id: request.userId },
        data: {
          plan: request.requestedPlan,
          // Same sentinel the manual activation one-liner uses: non-empty means
          // "paying", and it never expires on its own.
          stripeSubscriptionId: "manual",
        },
      });
    }
    return r;
  });

  console.log(
    `[admin] ${admin!.email} ${decision} upgrade ${id} for ${request.user.email} (${request.requestedPlan}, ${request.currency} ${request.amount})`
  );

  // Telling the owner is the point of the queue; a failure to send must not
  // undo a decision that has already been applied.
  if (emailConfigured()) {
    try {
      await sendEmail(
        upgradeDecisionEmail({
          to: request.user.email,
          name: request.user.name,
          approved: decision === "APPROVED",
          planLabel: PLANS[request.requestedPlan as Plan]?.label ?? request.requestedPlan,
          reviewNote,
          accountUrl: `${appUrl()}/account`,
        })
      );
    } catch (err) {
      console.error("Upgrade decision email failed:", err);
    }
  }

  return Response.json({ request: { id: updated.id, status: updated.status } });
}
