import Link from "next/link";
import { Toc } from "./Toc";

export type Audience = "owners" | "diners" | "everyone";

export type Block =
  | { kind: "p"; text: React.ReactNode }
  | { kind: "list"; items: React.ReactNode[] }
  | {
      kind: "partners";
      partners: { name: string; role: string; sees: string }[];
    };

export type LegalSection = {
  id: string;
  title: string;
  audience?: Audience;
  blocks: Block[];
};

const chipStyles: Record<Audience, { label: string; className: string }> = {
  owners: {
    label: "Restaurant owners",
    className: "border-accent/40 text-accent",
  },
  diners: { label: "Diners", className: "border-sky/40 text-sky" },
  everyone: { label: "Everyone", className: "border-navy-700 text-ink-faint" },
};

export function AudienceChip({ audience }: { audience: Audience }) {
  const chip = chipStyles[audience];
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${chip.className}`}
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {chip.label}
    </span>
  );
}

export function LegalHeader({
  eyebrow,
  title,
  updated,
  readingTime,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  readingTime: string;
}) {
  return (
    <header>
      <Link
        href="/"
        className="text-sm text-ink-faint transition-colors hover:text-ink-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        ← GoPlate
      </Link>
      <p
        className="mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {eyebrow}
      </p>
      <h1
        className="mt-3 text-4xl text-ink sm:text-5xl"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {title}
      </h1>
      <p className="mt-4 text-sm text-ink-faint">
        Last updated {updated} <span className="mx-2 text-navy-700">|</span> {readingTime}
      </p>
    </header>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "p") {
          return (
            <p key={i} className="mt-4 leading-relaxed text-ink-dim first:mt-0">
              {b.text}
            </p>
          );
        }
        if (b.kind === "list") {
          return (
            <ul key={i} className="mt-4 space-y-2.5 first:mt-0">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 leading-relaxed text-ink-dim">
                  <span aria-hidden className="mt-[11px] h-1 w-3 shrink-0 rounded-full bg-navy-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ul key={i} className="mt-5 space-y-3 first:mt-0">
            {b.partners.map((partner) => (
              <li
                key={partner.name}
                className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:flex sm:items-baseline sm:gap-4"
              >
                <p className="w-24 shrink-0 font-semibold text-ink">{partner.name}</p>
                <div>
                  <p className="text-sm text-ink-dim">{partner.role}</p>
                  <p className="mt-1 text-sm text-ink-faint">Sees: {partner.sees}</p>
                </div>
              </li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

export function LegalBody({
  sections,
  footer,
}: {
  sections: LegalSection[];
  footer: React.ReactNode;
}) {
  const tocItems = sections.map((s) => ({ id: s.id, label: s.title }));
  return (
    <div className="mt-14 gap-16 lg:grid lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-10">
          <Toc items={tocItems} />
        </div>
      </aside>
      <div className="min-w-0">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-14 scroll-mt-10 first:mt-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="text-2xl text-ink"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {s.title}
              </h2>
              {s.audience ? <AudienceChip audience={s.audience} /> : null}
            </div>
            <div className="mt-4">
              <Blocks blocks={s.blocks} />
            </div>
          </section>
        ))}
        <div className="mt-16 border-t border-navy-800 pt-6 text-sm text-ink-faint">{footer}</div>
      </div>
    </div>
  );
}
