import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — GoPlate",
  description: "How GoPlate collects, uses, and protects your data.",
};

const sections: { title: string; body: string }[] = [
  {
    title: "What we collect",
    body: "Restaurant owners: your name, email address, and the menu content you create (restaurant details, dish names, prices, photos, and videos). Customers viewing a menu: we do not require an account and do not collect personal information — menu pages are served like any website.",
  },
  {
    title: "How we use it",
    body: "Owner data is used solely to operate your account and publish your menus. Dish photos may be sent to our 3D-model generation partner to build the 3D versions of your dishes. Videos are processed on our servers to produce the edited clips shown on your menu.",
  },
  {
    title: "What we never do",
    body: "We do not sell your data, we do not show third-party advertising, and we do not use your content for anything other than displaying your menu.",
  },
  {
    title: "Storage and security",
    body: "Passwords are stored hashed (bcrypt). Sessions use signed tokens. Media files are stored on our infrastructure and served only through your public menu.",
  },
  {
    title: "Your controls",
    body: "You can edit or delete any dish, unpublish your menu at any time, or delete your restaurant entirely from the app — deletion removes the menu and its content permanently.",
  },
  {
    title: "Contact",
    body: "Questions or deletion requests: contact the GoPlate team at the email address listed on our Google Play store page.",
  },
];

export default function Privacy() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-ink-faint hover:text-ink-dim transition-colors">
        ← GoPlate
      </Link>
      <h1 className="mt-6 text-4xl text-ink" style={{ fontFamily: "var(--font-fraunces)" }}>
        Privacy policy
      </h1>
      <p className="mt-2 text-sm text-ink-faint">Last updated: July 11, 2026</p>
      {sections.map((s) => (
        <section key={s.title} className="mt-10">
          <h2 className="text-xl text-ink mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
            {s.title}
          </h2>
          <p className="text-ink-dim leading-relaxed">{s.body}</p>
        </section>
      ))}
    </main>
  );
}
