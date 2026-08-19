"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/home/Dynamic";
import { PLANS, priceFor, yearlySavingPercent, type BillingPeriod, type Plan } from "@/lib/plans";

/* ---------- Content (feature lists mirror the app's gates; prices come from
   src/lib/plans.ts so this page cannot drift from what we actually charge) ---------- */

const plans = [
  {
    id: "basic" as Plan,
    name: "Basic",
    tagline: "Your menu, live today",
    highlight: false,
    cta: { label: "Start free month", href: "/register" },
    features: [
      "1 restaurant",
      "Unlimited dishes & categories",
      "Dish photos on your menu",
      "2 dish videos + 2 photoreal 3D models",
      "QR code & your own look",
    ],
  },
  {
    id: "starter" as Plan,
    name: "Starter",
    tagline: "Bring your best dishes to life",
    highlight: true,
    cta: { label: "Sign in to upgrade", href: "/account" },
    features: [
      "Everything in Basic",
      "Up to 10 dish videos, auto-edited",
      "Up to 10 photoreal 3D models",
      "AR — dishes on the customer's table",
    ],
  },
  {
    id: "pro" as Plan,
    name: "Pro",
    tagline: "The full 3D experience, plus live ordering",
    highlight: false,
    cta: { label: "Sign in to upgrade", href: "/account" },
    features: [
      "Everything in Starter",
      "Unlimited videos & 3D models",
      "Your entire menu in 3D",
      "Live table ordering — customers order straight from the menu",
      "Kitchen orders screen in the app",
      "Up to 10 restaurants",
    ],
  },
] as const;

const comparison: { label: string; basic: string | boolean; starter: string | boolean; pro: string | boolean }[] = [
  { label: "Restaurants", basic: "1", starter: "1", pro: "Up to 10" },
  { label: "Dishes & categories", basic: "Unlimited", starter: "Unlimited", pro: "Unlimited" },
  { label: "Dish photos", basic: true, starter: true, pro: true },
  { label: "QR code menu", basic: true, starter: true, pro: true },
  { label: "Custom themes & colors", basic: true, starter: true, pro: true },
  { label: "Auto-edited dish videos", basic: "2", starter: "Up to 10", pro: "Unlimited" },
  { label: "Photoreal 3D dish models", basic: "2", starter: "Up to 10", pro: "Unlimited" },
  { label: "AR — view dishes on the table", basic: true, starter: true, pro: true },
  { label: "Live table ordering from the menu", basic: false, starter: false, pro: true },
  { label: "Kitchen orders screen in the app", basic: false, starter: false, pro: true },
];

const faqs = [
  {
    q: "How does the free month work?",
    a: "Create your account and you get 30 days of full access — no card needed. When the month ends, pick a plan from $2/mo to keep editing. Your published menu stays live for customers either way.",
  },
  {
    q: "How do I subscribe?",
    a: "From the GoPlate app for restaurant owners. Payment is handled securely by Stripe, and you can cancel anytime — no contracts.",
  },
  {
    q: "Do my customers need to install anything?",
    a: "Never. They scan the QR code at the table and your menu opens instantly in their phone's browser — 3D, AR, videos and all.",
  },
  {
    q: "What is live table ordering?",
    a: "On Pro menus, customers don't just browse — they build an order right from the 3D menu, add their table number and any notes, and send it. It appears instantly on the Orders screen in your GoPlate app, where the kitchen moves it from New to Preparing to Done. Payment stays at the venue, exactly as you run it today.",
  },
  {
    q: "How do the 3D models get made?",
    a: "You film a slow circle around the plate with your phone in the GoPlate app. We turn that capture into a photoreal 3D model your customers can spin, tilt, and place on their own table in AR.",
  },
];

/* ---------- Icons ---------- */

const tick = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const dash = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M6 12h12" />
  </svg>
);

const arrow = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </svg>
);

/* ---------- Spotlight / tilt card ---------- */

function SpotlightCard({
  highlight,
  children,
}: {
  highlight: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [spot, setSpot] = useState({ x: 50, y: 50, on: false });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setSpot({ x: px * 100, y: py * 100, on: true });
    setTilt({ rx: (0.5 - py) * 4, ry: (px - 0.5) * 4 });
  };

  const onLeave = () => {
    setSpot((s) => ({ ...s, on: false }));
    setTilt({ rx: 0, ry: 0 });
  };

  const card = (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative h-full overflow-hidden rounded-[26px] p-8 sm:p-10"
      style={{
        background: highlight
          ? "linear-gradient(165deg, #1c1712, var(--navy-900) 55%)"
          : "var(--navy-900)",
        border: highlight ? "none" : "1px solid var(--navy-700)",
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: "transform 0.25s ease-out",
      }}
    >
      {/* Mouse-tracking glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: spot.on ? 1 : 0,
          background: `radial-gradient(420px circle at ${spot.x}% ${spot.y}%, ${
            highlight ? "rgba(240,118,46,0.14)" : "rgba(63,169,224,0.10)"
          }, transparent 65%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );

  if (!highlight) return card;

  // Pro: animated conic-gradient border under the card
  return (
    <div className="relative rounded-[27px] p-px overflow-hidden">
      <div
        aria-hidden
        className="absolute -inset-[150%] plans-spin"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--accent) 55deg, #f5934f 90deg, transparent 140deg, transparent 200deg, var(--sky) 265deg, transparent 320deg)",
        }}
      />
      <div className="relative h-full rounded-[26px]">{card}</div>
    </div>
  );
}

/* ---------- FAQ accordion ---------- */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="rounded-[26px] border border-navy-700 bg-navy-900 divide-y divide-navy-800">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-6 px-6 sm:px-8 py-5 text-left"
            >
              <span className={`text-[15px] sm:text-base font-semibold ${isOpen ? "text-ink" : "text-ink-dim"}`}>
                {f.q}
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-accent transition-transform duration-300"
                style={{
                  borderColor: isOpen ? "var(--accent)" : "var(--navy-700)",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-6 sm:px-8 pb-6 text-sm text-ink-dim leading-relaxed max-w-2xl">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Page ---------- */

export function PlansClient() {
  // Monthly by default: the headline number a first-time visitor compares is
  // the monthly one, and the yearly saving reads as a discount off it.
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const saving = yearlySavingPercent();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ fontFamily: "var(--font-poppins)" }}>
      <style>{`
        @keyframes plans-spin { to { transform: rotate(360deg); } }
        .plans-spin { animation: plans-spin 7s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .plans-spin { animation: none; }
        }
      `}</style>

      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full blur-[130px] floaty"
          style={{ background: "rgba(240,118,46,0.13)" }}
        />
        <div
          className="absolute top-1/2 -left-48 h-[420px] w-[420px] rounded-full blur-[120px]"
          style={{ background: "rgba(63,169,224,0.08)" }}
        />
        <div
          className="absolute bottom-0 -right-40 h-[380px] w-[520px] rounded-full blur-[130px]"
          style={{ background: "rgba(240,118,46,0.07)" }}
        />
      </div>

      {/* Slim header */}
      <header className="relative z-10 max-w-[1200px] mx-auto w-full px-6 sm:px-10 pt-7 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="GoPlate logo" width={40} height={40} priority className="rounded-xl" />
          <span className="text-xl font-extrabold tracking-wide text-ink">
            <span className="text-accent">Go</span>Plate
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="rounded-full border border-navy-700 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold tracking-wide text-ink-dim hover:text-ink transition-colors whitespace-nowrap"
          >
            SIGN IN
          </Link>
          <Link
            href="/r/demo-bistro"
            className="rounded-full px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wide text-white whitespace-nowrap"
            style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
          >
            VIEW DEMO MENU
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-[1200px] mx-auto w-full px-6 sm:px-10 flex-1">
        {/* Hero */}
        <section className="pt-16 sm:pt-24 text-center rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-navy-700 bg-navy-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Packages &amp; Plans
          </p>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold leading-[1.05] text-ink">
            One menu.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(100deg, var(--accent), #f5934f 55%, var(--sky))" }}
            >
              Two ways to serve it.
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-ink-dim leading-relaxed max-w-xl mx-auto">
            Every plan starts with a free month — full access, cancel anytime. From $2/mo after
            that, up to your entire menu in photoreal 3D.
          </p>
        </section>

        {/* Billing period */}
        <section className="mt-10 flex justify-center">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex rounded-full border border-navy-700 bg-navy-900/70 p-1"
          >
            {(["monthly", "yearly"] as BillingPeriod[]).map((pd) => {
              const on = period === pd;
              return (
                <button
                  key={pd}
                  type="button"
                  onClick={() => setPeriod(pd)}
                  aria-pressed={on}
                  className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                  style={
                    on
                      ? { background: "linear-gradient(100deg, var(--accent), #f5934f)", color: "#fff" }
                      : { color: "var(--ink-dim)" }
                  }
                >
                  {pd === "monthly" ? "Monthly" : "Yearly"}
                  {pd === "yearly" && (
                    <span className={`ml-2 text-xs font-bold ${on ? "text-white/90" : "text-accent"}`}>
                      Save {saving}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Plan cards */}
        <section className="mt-10 sm:mt-14 grid gap-6 lg:gap-8 md:grid-cols-3 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <Reveal key={plan.id} className="h-full">
              <div className="relative h-full">
                {plan.highlight && (
                  <span
                    className="absolute -top-3 right-8 z-10 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    Most popular
                  </span>
                )}
                <SpotlightCard highlight={plan.highlight}>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink-dim">{plan.name}</p>
                  <p className="mt-1 text-sm text-ink-faint">{plan.tagline}</p>
                  <p className="mt-5 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-ink">
                      ${priceFor(plan.id, period)}
                    </span>
                    <span className="text-sm font-medium text-ink-faint">
                      / {period === "yearly" ? "per year" : "per month"}
                    </span>
                  </p>
                  {period === "yearly" && (
                    <p className="mt-1.5 text-xs text-ink-faint">
                      ${(PLANS[plan.id].priceYearlyUsd / 12).toFixed(2)}/mo, billed once a year —
                      two months free.
                    </p>
                  )}
                  <ul className="mt-7 space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-ink-dim">
                        <span className={`mt-px ${plan.highlight ? "text-accent" : "text-sky"}`}>{tick}</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    // Carry the chosen period so the upgrade form opens on the
                    // same one — picking "Yearly" here and landing on a monthly
                    // form is the kind of small betrayal that loses the sale.
                    href={
                      period === "yearly" && plan.cta.href === "/account"
                        ? "/account?period=yearly"
                        : plan.cta.href
                    }
                    className="mt-9 inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-bold tracking-wide transition-colors"
                    style={
                      plan.highlight
                        ? { background: "linear-gradient(100deg, var(--accent), #f5934f)", color: "#fff" }
                        : { border: "1px solid var(--navy-700)", color: "var(--ink)" }
                    }
                  >
                    {plan.cta.label} {arrow}
                  </Link>
                  {plan.highlight && (
                    <p className="mt-4 text-center text-xs text-ink-faint">
                      Billed via Stripe in the GoPlate app · cancel anytime
                    </p>
                  )}
                </SpotlightCard>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Comparison table */}
        <section className="mt-24 sm:mt-32 max-w-4xl mx-auto">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent text-center">
              Side by side
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink text-center">
              Everything in each plan
            </h2>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-4 pl-5 font-semibold text-ink-faint uppercase tracking-wider text-xs">
                      Feature
                    </th>
                    <th className="pb-4 w-32 text-center font-bold text-ink">Basic</th>
                    <th className="pb-4 w-32 text-center font-bold text-ink">Starter</th>
                    <th className="pb-4 w-32 text-center">
                      <span
                        className="inline-block rounded-full px-4 py-1 font-bold text-white"
                        style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
                      >
                        Pro
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => (
                    <tr key={row.label} className="group">
                      <td
                        className={`py-4 pl-5 text-ink-dim group-hover:text-ink transition-colors border-t border-navy-800 ${
                          i === 0 ? "rounded-tl-2xl" : ""
                        }`}
                      >
                        {row.label}
                      </td>
                      {([row.basic, row.starter, row.pro] as const).map((v, col) => (
                        <td
                          key={col}
                          className={`py-4 text-center border-t border-navy-800 ${
                            col === 2 ? "bg-accent/[0.04]" : ""
                          }`}
                        >
                          {typeof v === "string" ? (
                            <span className={col === 2 ? "font-semibold text-ink" : "text-ink-dim"}>{v}</span>
                          ) : v ? (
                            <span className={`inline-flex ${col === 2 ? "text-accent" : "text-sky"}`}>{tick}</span>
                          ) : (
                            <span className="inline-flex text-ink-faint/50">{dash}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="mt-24 sm:mt-32 max-w-3xl mx-auto">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent text-center">
              Good to know
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink text-center">
              Questions, answered
            </h2>
            <div className="mt-10">
              <Faq />
            </div>
          </Reveal>
        </section>

        {/* Bottom CTA */}
        <section className="mt-24 sm:mt-32 mb-24">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-[28px] border border-navy-700 px-8 py-14 sm:py-16 text-center"
              style={{ background: "linear-gradient(140deg, var(--navy-900), #1c1712)" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[560px] rounded-full blur-[100px]"
                style={{ background: "rgba(240,118,46,0.16)" }}
              />
              <h2 className="relative text-3xl sm:text-4xl font-extrabold text-ink">
                Your menu could look like this tonight
              </h2>
              <p className="relative mt-4 text-ink-dim max-w-md mx-auto">
                See exactly what your customers would get — open the live demo menu and spin a dish
                around.
              </p>
              <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/r/demo-bistro"
                  className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold tracking-wider text-white"
                  style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
                >
                  OPEN THE DEMO MENU {arrow}
                </Link>
                <span className="inline-block rounded-full border border-navy-700 px-6 py-3.5 text-sm text-ink-dim">
                  Owner app coming soon to Google Play
                </span>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 mt-auto border-t border-navy-800 px-6 py-8 text-center text-sm text-ink-faint">
        <p>
          <Link href="/" className="hover:text-ink-dim transition-colors">
            Home
          </Link>
          <span className="mx-3">·</span>
          <Link href="/privacy" className="hover:text-ink-dim transition-colors">
            Privacy policy
          </Link>
        </p>
      </footer>
    </div>
  );
}
