import type { Metadata } from "next";
import Link from "next/link";
import { LegalBody, LegalHeader, type LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — GoPlate",
  description: "How GoPlate collects, uses, and protects your data — the short version and the full one.",
};

const shortVersion: { claim: string; verdict: string }[] = [
  { claim: "Your menu, photos & 3D models", verdict: "Yours, always" },
  { claim: "Ads & third-party trackers", verdict: "None" },
  { claim: "Selling your data", verdict: "Never" },
  { claim: "AI training on your content", verdict: "Never" },
  { claim: "Card numbers on our servers", verdict: "Never" },
  { claim: "Deleting your account", verdict: "Anytime, in-app" },
];

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "GoPlate is a menu platform that lets restaurants present their dishes in 3D and AR, share their menu through a QR code, and take orders from the table. It is operated by the GoPlate team in Colombo, Sri Lanka. This policy covers the GoPlate website, the GoPlate mobile app for restaurant owners, and every public menu page we host.",
      },
      {
        kind: "p",
        text: "Three kinds of people interact with GoPlate, and we treat their data differently: restaurant owners who create an account, diners who view a menu or place an order, and visitors to this website. Each section below is tagged with who it applies to.",
      },
    ],
  },
  {
    id: "owner-data",
    title: "What we collect from you",
    audience: "owners",
    blocks: [
      {
        kind: "list",
        items: [
          <>
            <strong className="font-semibold text-ink">Account details</strong> — your name, email
            address, and a password. Passwords are never stored in plain text, only a bcrypt hash.
          </>,
          <>
            <strong className="font-semibold text-ink">Menu content</strong> — restaurant names and
            settings, categories, dish names, descriptions, prices, tags, and the photos and videos
            you upload or film.
          </>,
          <>
            <strong className="font-semibold text-ink">Plan status</strong> — which plan you are
            on, trial dates, and, when paid checkout is active, a reference to your payment
            subscription. Card numbers never touch our servers (see Payments).
          </>,
          <>
            <strong className="font-semibold text-ink">Order records</strong> — the orders your
            customers place, which appear on your Orders screen.
          </>,
        ],
      },
    ],
  },
  {
    id: "diner-data",
    title: "What we collect from diners",
    audience: "diners",
    blocks: [
      {
        kind: "p",
        text: "Diners never need an account and never install anything — viewing a menu is like viewing any web page. If a restaurant has table ordering enabled and you place an order, we store exactly what you submit: the items you chose, and optionally a name, table number, and a note (“no onions please”). That information is collected on behalf of the restaurant you ordered from, is visible only to that restaurant, and is used for nothing else.",
      },
      {
        kind: "p",
        text: "We do not run advertising or analytics trackers on menu pages, and we do not build profiles of diners.",
      },
    ],
  },
  {
    id: "how-we-use-it",
    title: "How we use your data",
    audience: "owners",
    blocks: [
      {
        kind: "list",
        items: [
          "To operate your account, publish your menus, and deliver orders to your Orders screen.",
          "To generate 3D models — photos and video frames of a dish are sent to our 3D partner solely to produce the model, which is then stored with your menu.",
          "To produce menu clips — uploaded videos are processed on our own servers (trimmed, resized, audio removed). The original recording is never published.",
          "To reach you about your account — a trial that is ending, or an important service change. We do not send marketing email.",
        ],
      },
    ],
  },
  {
    id: "third-parties",
    title: "The three companies we rely on",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "GoPlate shares data with exactly three service providers, each for one job. Nothing is shared with anyone else, and none of them may use your data for their own purposes.",
      },
      {
        kind: "partners",
        partners: [
          {
            name: "Meshy",
            role: "Generates the 3D model of a dish from your photos and video frames.",
            sees: "dish photos and video frames — never your account details.",
          },
          {
            name: "Stripe",
            role: "Processes card payments when you buy a plan on our website.",
            sees: "your card details (directly — they never pass through GoPlate) and billing email.",
          },
          {
            name: "Railway",
            role: "Hosts GoPlate’s servers and database.",
            sees: "encrypted traffic and stored data, as any hosting provider does.",
          },
        ],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    audience: "owners",
    blocks: [
      {
        kind: "p",
        text: "Subscriptions are purchased on this website, not inside the mobile app. When card checkout is active it is handled by Stripe, a PCI-DSS-certified payment processor: your card details go directly to Stripe, and we only receive confirmation that a payment succeeded along with a subscription reference. While we onboard our payment gateway, some plans are activated manually by our team after you contact us — in that case we handle no payment data at all.",
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookies & sessions",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "We use a single kind of cookie: a signed session credential that keeps restaurant owners logged in. There are no advertising cookies, no analytics cookies, and no third-party trackers anywhere on GoPlate. Public menu pages set no cookies at all beyond what is technically required to serve them.",
      },
    ],
  },
  {
    id: "storage",
    title: "Where data lives & how long",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "GoPlate runs on Railway infrastructure, and all traffic is encrypted in transit with HTTPS. Your data may be stored on servers outside Sri Lanka. We keep content for as long as your account exists: deleting a dish, a restaurant, or your whole account removes the content and media permanently — deletion is not a soft-hide. Order records are kept until the restaurant that owns them deletes them or deletes its account.",
      },
    ],
  },
  {
    id: "never",
    title: "What we never do",
    audience: "everyone",
    blocks: [
      {
        kind: "list",
        items: [
          "Sell your data — not owner data, not diner data.",
          "Show third-party advertising.",
          "Use your photos, videos, or 3D models for anything other than displaying your own menu — including training AI models.",
          "Share data with anyone beyond the three processors named above, and only ever to the extent their one job requires.",
        ],
      },
    ],
  },
  {
    id: "your-rights",
    title: "Your rights & controls",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "Under Sri Lanka’s Personal Data Protection Act No. 9 of 2022, and comparable laws elsewhere such as the GDPR, you have the right to access, correct, export, and erase your personal data. In practice:",
      },
      {
        kind: "list",
        items: [
          "Edit or delete any dish, photo, or video at any time from the app.",
          "Unpublish a menu instantly — it disappears from its public link.",
          <>
            Delete your account from inside the app (
            <strong className="font-semibold text-ink">Account → Delete account</strong>). This
            permanently removes your restaurants, menus, media, and order history.
          </>,
          "Email us for anything else — a copy of your data, a correction, or a deletion request if you can no longer access the app. We respond within 30 days.",
        ],
      },
      {
        kind: "p",
        text: "If you are a diner and want an order record removed, contact the restaurant you ordered from — they own that record — or email us and we will help.",
      },
    ],
  },
  {
    id: "children",
    title: "Children",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "GoPlate accounts are a business tool intended for people 18 or older, and we do not knowingly collect personal data from children. Public menu pages can be viewed by anyone, but they collect no personal data from viewers.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: "If we change this policy in a way that matters — new data, new processor, new purpose — we will update this page and the date at the top, and for significant changes we will email account holders before the change takes effect.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    audience: "everyone",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            Questions, access requests, or deletion requests:{" "}
            <a
              href="mailto:malikanishnatha4@gmail.com"
              className="text-ink underline underline-offset-4 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              malikanishnatha4@gmail.com
            </a>
            . We are a small team and we read everything.
          </>
        ),
      },
    ],
  },
];

export default function Privacy() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <LegalHeader
        eyebrow="GoPlate · Legal"
        title="Privacy policy"
        updated="July 26, 2026"
        readingTime="5 min read"
      />

      {/* The short version — set like a menu card, because menus are what we do */}
      <section
        aria-label="The short version"
        className="mt-12 rounded-2xl border border-navy-800 bg-navy-900 p-6 sm:p-8"
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          The short version
        </p>
        <ul className="mt-5 space-y-3.5">
          {shortVersion.map((row) => (
            <li key={row.claim} className="flex items-baseline gap-2 text-[15px] sm:text-base">
              <span className="min-w-0 text-ink-dim">{row.claim}</span>
              <span
                aria-hidden
                className="mx-1 min-w-6 flex-1 border-b-2 border-dotted border-navy-700"
                style={{ transform: "translateY(-4px)" }}
              />
              <span className="max-w-[45%] shrink-0 text-right font-semibold text-ink">
                {row.verdict}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-relaxed text-ink-faint">
          That is the whole policy in six lines. The full detail — written to be read, not to hide
          things — follows below.
        </p>
      </section>

      <LegalBody
        sections={sections}
        footer={
          <p>
            See also our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 transition-colors hover:text-ink-dim"
            >
              Terms of service
            </Link>{" "}
            and{" "}
            <Link
              href="/about"
              className="underline underline-offset-4 transition-colors hover:text-ink-dim"
            >
              About us
            </Link>
            .
          </p>
        }
      />
    </main>
  );
}
