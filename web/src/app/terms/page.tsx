import type { Metadata } from "next";
import Link from "next/link";
import { LegalBody, LegalHeader, type LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — GoPlate",
  description: "The agreement between GoPlate and the restaurants that use it.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "1. The agreement",
    blocks: [
      {
        kind: "p",
        text: "These terms are an agreement between you and the GoPlate team (“GoPlate”, “we”) covering your use of the GoPlate website, the GoPlate mobile app, and the menu pages we host. By creating an account or using the service you accept these terms. If you are accepting on behalf of a restaurant or company, you confirm you have the authority to bind it.",
      },
    ],
  },
  {
    id: "who-may-use",
    title: "2. Who may use GoPlate",
    blocks: [
      {
        kind: "p",
        text: "GoPlate accounts are a business tool for restaurants, cafés, and food businesses. You must be at least 18 years old to hold an account. Diners viewing a menu or placing an order do not need an account and are not bound by the account terms — only by ordinary lawful use of the site.",
      },
    ],
  },
  {
    id: "your-account",
    title: "3. Your account",
    blocks: [
      {
        kind: "list",
        items: [
          "Keep your login credentials confidential. You are responsible for activity that happens under your account.",
          "Give us accurate account information and keep it current — we use your email for essential service messages.",
          "Tell us promptly at the contact address below if you believe your account has been compromised.",
        ],
      },
    ],
  },
  {
    id: "billing",
    title: "4. Plans, trials & billing",
    blocks: [
      {
        kind: "list",
        items: [
          "New accounts start with a full-featured 30-day free trial. No payment details are required to start the trial.",
          "Paid plans are purchased on this website — never inside the mobile app. The price, currency, and billing period are shown before you pay.",
          "Subscriptions renew automatically until cancelled. You can cancel at any time; your plan stays active until the end of the period you paid for. We do not give partial refunds for unused time unless the law where you live requires it.",
          "While our payment gateway is being onboarded, some plans are activated manually by our team after you contact us; whatever is agreed in that exchange (price and period) applies.",
          "We may change plan prices or features with at least 30 days’ notice by email. Changes never apply retroactively to a period you have already paid for.",
          "If a payment fails or a subscription lapses, your menus may revert to the free tier’s limits, but we do not delete your content.",
        ],
      },
    ],
  },
  {
    id: "your-content",
    title: "5. Your content",
    blocks: [
      {
        kind: "p",
        text: "Everything you upload — dish names, descriptions, prices, photos, videos, and the 3D models generated from them — remains yours. We claim no ownership. You grant us a limited licence to store, process, and display that content, solely to run the service: hosting your menu, generating 3D models (which involves sending photos and video frames to our 3D-generation partner), editing videos into menu clips, and showing your menu to the people you share it with. The licence ends when you delete the content or your account.",
      },
      { kind: "p", text: "You are responsible for your content. In particular:" },
      {
        kind: "list",
        items: [
          "You must have the rights to every photo and video you upload.",
          "Menu information — prices, availability, ingredients, allergen and dietary tags — is provided by you, and keeping it accurate is your responsibility. Diners rely on it, and GoPlate is not liable for inaccurate menu information.",
          "Content must not be unlawful, deceptive, infringing, or offensive. We may remove content or suspend accounts that break this rule, and where possible we will tell you first.",
        ],
      },
    ],
  },
  {
    id: "ordering",
    title: "6. Table ordering",
    blocks: [
      {
        kind: "p",
        text: "GoPlate’s ordering feature transmits a diner’s order to the restaurant’s Orders screen. GoPlate is a messenger, not a party to the sale: the contract for the food is between the diner and the restaurant. The restaurant is responsible for fulfilling, refusing, or refunding orders, and payment for the food happens at the restaurant’s counter (or however the restaurant chooses) — GoPlate does not process food payments and owes neither party the value of an order.",
      },
    ],
  },
  {
    id: "acceptable-use",
    title: "7. Acceptable use",
    blocks: [
      {
        kind: "list",
        items: [
          "Don’t attempt to breach, probe, or overload the service, or access another account’s data.",
          "Don’t use GoPlate to send spam or place fake orders.",
          "Don’t resell, scrape, or copy the service or other restaurants’ content.",
          "Don’t use the service to break any law that applies to you or your restaurant.",
        ],
      },
    ],
  },
  {
    id: "availability",
    title: "8. Availability & changes",
    blocks: [
      {
        kind: "p",
        text: "We work hard to keep GoPlate available around the clock, but we are a small team and the service is provided “as is” and “as available” — we cannot promise uninterrupted or error-free operation, and short maintenance windows may occur. We may add, change, or retire features; if a change materially reduces what your paid plan includes, we will tell you in advance and you may cancel for a pro-rated refund of the remaining period.",
      },
    ],
  },
  {
    id: "liability",
    title: "9. Liability",
    blocks: [
      {
        kind: "p",
        text: "To the fullest extent the law allows: GoPlate is not liable for indirect or consequential losses (lost profits, lost custom, lost data that you could have kept a copy of), and our total liability for any claim arising from the service is capped at the amount you paid us in the twelve months before the claim. Nothing in these terms limits liability that cannot legally be limited, such as liability for fraud.",
      },
    ],
  },
  {
    id: "ending",
    title: "10. Ending the agreement",
    blocks: [
      {
        kind: "list",
        items: [
          <>
            You can stop using GoPlate and delete your account at any time from inside the app (
            <strong className="font-semibold text-ink">Account → Delete account</strong>). Deletion
            permanently removes your restaurants, menus, media, and order history.
          </>,
          "We may suspend or terminate an account that seriously or repeatedly breaks these terms. Unless the breach makes it impossible, we will warn you and give you a chance to fix it first.",
          "If we ever discontinue GoPlate entirely, we will give account holders at least 60 days’ notice and a way to export their menu content.",
        ],
      },
    ],
  },
  {
    id: "law",
    title: "11. Governing law",
    blocks: [
      {
        kind: "p",
        text: "These terms are governed by the laws of the Democratic Socialist Republic of Sri Lanka, and disputes are subject to the jurisdiction of the courts of Colombo — except where the consumer-protection law of your own country gives you rights and venues that cannot be waived.",
      },
    ],
  },
  {
    id: "changes",
    title: "12. Changes to these terms",
    blocks: [
      {
        kind: "p",
        text: "We may update these terms as the service evolves. For material changes we will email account holders at least 14 days before the new terms take effect; continuing to use GoPlate after that date means you accept them. The date at the top always shows the current version.",
      },
    ],
  },
  {
    id: "contact",
    title: "13. Contact",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            Questions about these terms:{" "}
            <a
              href="mailto:malikanishnatha4@gmail.com"
              className="text-ink underline underline-offset-4 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              malikanishnatha4@gmail.com
            </a>
            .
          </>
        ),
      },
    ],
  },
];

export default function Terms() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <LegalHeader
        eyebrow="GoPlate · Legal"
        title="Terms of service"
        updated="July 26, 2026"
        readingTime="6 min read"
      />
      <LegalBody
        sections={sections}
        footer={
          <p>
            See also our{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 transition-colors hover:text-ink-dim"
            >
              Privacy policy
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
