/**
 * Outbound transactional email.
 *
 * Deliberately a single seam with no SDK: Resend's REST API is one `fetch`, so
 * swapping providers (Postmark, SES, SMTP via nodemailer) means rewriting
 * `deliver()` and nothing else.
 *
 * Unconfigured behaviour differs by environment on purpose:
 *  - development: the message is printed to the server log so the whole reset
 *    flow can be exercised without an email account.
 *  - production: `sendEmail` throws, so a misconfigured deploy fails loudly
 *    instead of silently swallowing password-reset links.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

/** Absolute base URL for links inside emails. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

async function deliver(email: Email): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email provider rejected the message (${res.status}): ${detail.slice(0, 300)}`);
  }
}

export async function sendEmail(email: Email): Promise<void> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM to send password-reset links."
      );
    }
    console.info(
      `\n--- email (dev, not sent) ---\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n-----------------------------\n`
    );
    return;
  }
  await deliver(email);
}

/* ---------- Templates ---------- */

const BRAND = {
  bg: "#070708",
  card: "#121214",
  border: "#2a2a30",
  ink: "#f4f4f1",
  inkDim: "#b9b9b2",
  inkFaint: "#80807a",
  accent: "#f0762e",
};

/**
 * Reset email. Table-based and inline-styled because that is what mail clients
 * (Outlook especially) actually render; the plain-text part is a real fallback,
 * not a placeholder.
 */
export function passwordResetEmail(opts: {
  to: string;
  name: string;
  url: string;
  expiresMinutes: number;
}): Email {
  const { to, name, url, expiresMinutes } = opts;
  const greeting = name.trim() ? `Hi ${escapeHtml(name.trim().split(" ")[0])},` : "Hi,";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BRAND.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:20px;">
            <tr>
              <td style="padding:32px 32px 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:20px;font-weight:800;color:${BRAND.ink};letter-spacing:0.5px;">
                  <span style="color:${BRAND.accent};">Go</span>Plate
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:${BRAND.ink};">Reset your password</h1>
                <p style="margin:0 0 8px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">${greeting}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">
                  We got a request to reset the password for your GoPlate account. Tap the button below to choose a new one.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 24px;">
                <a href="${url}" style="display:inline-block;background:${BRAND.accent};color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:999px;">
                  Choose a new password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${BRAND.inkFaint};">
                  This link expires in ${expiresMinutes} minutes and can only be used once.
                  If you didn't ask for this, you can safely ignore this email — your password stays as it is.
                </p>
                <p style="margin:0 0 6px;font-size:12px;color:${BRAND.inkFaint};">Button not working? Paste this into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;color:${BRAND.accent};">${url}</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.inkFaint};">
            Sent by GoPlate because someone requested a password reset for ${escapeHtml(to)}.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    greeting,
    "",
    "We got a request to reset the password for your GoPlate account.",
    "Open this link to choose a new one:",
    "",
    url,
    "",
    `The link expires in ${expiresMinutes} minutes and can only be used once.`,
    "If you didn't ask for this, ignore this email — your password stays as it is.",
    "",
    "— GoPlate",
  ].join("\n");

  return { to, subject: "Reset your GoPlate password", html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- Back-office notifications ---------- */

/**
 * Shared shell so every transactional email looks like the reset one without
 * three copies of the same table markup.
 */
function shell(opts: { heading: string; greeting: string; bodyHtml: string; footer: string }): string {
  const { heading, greeting, bodyHtml, footer } = opts;
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BRAND.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:20px;">
            <tr>
              <td style="padding:32px 32px 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:20px;font-weight:800;color:${BRAND.ink};letter-spacing:0.5px;">
                  <span style="color:${BRAND.accent};">Go</span>Plate
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:${BRAND.ink};">${heading}</h1>
                <p style="margin:0 0 8px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">${greeting}</p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:12px;line-height:19px;color:${BRAND.inkFaint};">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">${label}</a></p>`;
}

function firstName(name: string): string {
  return name.trim() ? `Hi ${escapeHtml(name.trim().split(" ")[0])},` : "Hi,";
}

/** Sent when an admin approves or rejects an upgrade request. */
export function upgradeDecisionEmail(opts: {
  to: string;
  name: string;
  approved: boolean;
  planLabel: string;
  reviewNote: string;
  accountUrl: string;
}): Email {
  const { to, name, approved, planLabel, reviewNote, accountUrl } = opts;
  const plan = escapeHtml(planLabel);
  const note = reviewNote.trim();

  const bodyHtml = approved
    ? `<p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">
         Your payment checked out and your account is now on <strong style="color:${BRAND.ink};">${plan}</strong>. Everything is unlocked right away — no need to sign in again.
       </p>
       ${note ? `<p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">${escapeHtml(note)}</p>` : ""}
       ${button(accountUrl, "View your plan")}`
    : `<p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">
         We weren't able to confirm the payment for <strong style="color:${BRAND.ink};">${plan}</strong> yet, so your plan hasn't changed.
       </p>
       ${note ? `<p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">${escapeHtml(note)}</p>` : ""}
       <p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${BRAND.inkDim};">
         You can send a new request with the correct slip whenever you're ready.
       </p>
       ${button(accountUrl, "Try again")}`;

  const html = shell({
    heading: approved ? `You're on ${plan}` : "We couldn't confirm that payment",
    greeting: firstName(name),
    bodyHtml,
    footer: `Sent by GoPlate about the upgrade request for ${escapeHtml(to)}.`,
  });

  const text = [
    approved ? `Your GoPlate account is now on ${planLabel}.` : `We couldn't confirm your payment for ${planLabel}, so your plan hasn't changed.`,
    note ? `\nNote: ${note}` : "",
    `\n${accountUrl}`,
  ].join("\n");

  return {
    to,
    subject: approved ? `Your GoPlate plan is now ${planLabel}` : "About your GoPlate upgrade request",
    html,
    text,
  };
}

/** Sent when an admin answers a problem report. */
export function supportReplyEmail(opts: {
  to: string;
  name: string;
  subject: string;
  reply: string;
  accountUrl: string;
}): Email {
  const { to, name, subject, reply, accountUrl } = opts;

  const bodyHtml = `<p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkFaint};">You wrote: ${escapeHtml(subject)}</p>
     <p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${BRAND.inkDim};white-space:pre-wrap;">${escapeHtml(reply)}</p>
     ${button(accountUrl, "Open your account")}`;

  const html = shell({
    heading: "We've replied to your message",
    greeting: firstName(name),
    bodyHtml,
    footer: `Sent by GoPlate in reply to the message from ${escapeHtml(to)}.`,
  });

  const text = `You wrote: ${subject}\n\n${reply}\n\n${accountUrl}`;

  return { to, subject: `Re: ${subject}`, html, text };
}
