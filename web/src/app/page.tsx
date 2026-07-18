import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { NavBar } from "@/components/home/NavBar";
import { HeroShowcase, type ShowcaseDish } from "@/components/home/HeroShowcase";
import { Reveal, CountUp, LiveDish3D } from "@/components/home/Dynamic";
import { PhoneVideo } from "@/components/home/PhoneVideo";

export const dynamic = "force-dynamic";

async function getLiveData() {
  try {
    const demo = await prisma.restaurant.findFirst({
      where: { slug: "demo-bistro", isPublished: true },
      include: {
        items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    const showcase: ShowcaseDish[] = (demo?.items ?? []).slice(0, 6).map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      caption: i.caption,
      price: i.price,
      imageUrl: i.imageUrl,
      has3D: i.modelStatus === "READY" && !!i.modelUrl,
    }));
    const dish3d = demo?.items.find((i) => i.modelStatus === "READY" && i.modelUrl) ?? null;
    return {
      showcase,
      currency: demo?.currency ?? "USD",
      dish3d,
    };
  } catch {
    // Database not reachable (fresh deploy) — the page still renders fully static
    return { showcase: [], currency: "USD", dish3d: null };
  }
}

/* ---------- Small inline icons (match the mockup's outlined circle style) ---------- */

function CircleIcon({ children, size = 56 }: { children: React.ReactNode; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full border shrink-0"
      style={{ width: size, height: size, borderColor: "var(--accent)", color: "var(--accent)" }}
    >
      {children}
    </span>
  );
}

const icons = {
  cube: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9L12 2.5Z" />
      <path d="M3 7.5l9 5 9-5M12 12.5v9" />
    </svg>
  ),
  pointer: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11.5V4.8a1.8 1.8 0 0 1 3.6 0v5.7l4.5.9a2 2 0 0 1 1.6 2.3l-.8 4.3a3 3 0 0 1-3 2.5h-3.7a3 3 0 0 1-2.2-1L5.5 15.6a1.6 1.6 0 0 1 2.3-2.2L9 14.5" />
    </svg>
  ),
  leaf: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-8 4-13 14-14-.5 10-5 14-11 14-1 0-2-.2-3-.7" />
      <path d="M5 19c3-5 7-8 11-9" />
    </svg>
  ),
  qr: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.8v2.8H14zM17.8 17.8h2.7v2.7h-2.7z" />
    </svg>
  ),
  check: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  ),
  heart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M12 20S4.5 15.4 3 10.7C2 7.6 4 5 6.8 5 8.8 5 10.4 6.2 12 8.4 13.6 6.2 15.2 5 17.2 5 20 5 22 7.6 21 10.7 19.5 15.4 12 20 12 20Z" />
    </svg>
  ),
  play: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M4 2.5v9l7-4.5-7-4.5Z" />
    </svg>
  ),
  arrow: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  ),
};

/* ---------- Content ---------- */

const heroFeatures = [
  { icon: icons.cube, title: "Realistic 3D Models", sub: "See every detail" },
  { icon: icons.pointer, title: "Interactive Experience", sub: "Rotate, zoom & explore" },
  { icon: icons.leaf, title: "Fresh & Updated", sub: "Always up to date" },
];

const journey = [
  { icon: icons.qr, title: "Scan QR", body: "Scan the QR code at your table" },
  { icon: icons.cube, title: "Explore in 3D", body: "View dishes in immersive 3D experience" },
  { icon: icons.check, title: "Choose & Enjoy", body: "Pick your favorites and enjoy your meal" },
  { icon: icons.heart, title: "Love the Experience", body: "Better insights, better dining experience" },
];

const features = [
  {
    title: "Dishes in 3D & AR",
    body: "Customers spin, tilt, and zoom every plate before they order — or place it on their own table in AR. Menus stop being lists and start being appetites.",
  },
  {
    title: "Auto-edited kitchen videos",
    body: "Film the cooking however you like — GoPlate trims, speeds up, and polishes it into a looping clip automatically.",
  },
  {
    title: "Your menu, your look",
    body: "Pick a theme, layout, accent color, and caption from the app. The menu is yours, not a template.",
  },
  {
    title: "No app for customers",
    body: "One QR scan opens the menu in any phone browser. Zero friction between hungry and ordering.",
  },
];

const steps = [
  {
    title: "Film your dish",
    body: "Open the GoPlate app, place the plate on a table, and record a slow circle around it. Thirty seconds is enough.",
  },
  {
    title: "We do the magic",
    body: "Your capture becomes a photoreal 3D model — and your cooking videos are auto-edited into tight, menu-ready clips.",
  },
  {
    title: "Print one QR code",
    body: "Put it on the table, the door, or the counter. Customers scan it and your full menu opens instantly — no app needed.",
  },
];

/* The quiet problem: why text menus leave money on the table */
const problems = [
  {
    title: "Guessing feels risky",
    body: "When guests can't see a dish, they order the safest, cheapest thing they already know. Your best plates never get a chance.",
  },
  {
    title: "Bad photos backfire",
    body: "A dim, blurry phone photo makes a great dish look worse than no photo at all — and drags the whole menu down with it.",
  },
  {
    title: "Unsure guests spend less",
    body: "Hesitation quietly shrinks the bill: no starter, no dessert, no second look at the specials.",
  },
];

/* Industry-backed payoff stats (independent research, not our claims) */
const payoffStats = [
  { value: 30, label: "Bigger average checks", source: "digital-menu industry data" },
  { value: 94, label: "More buying confidence with 3D/AR", source: "retail AR studies" },
  { value: 44, label: "More orders for dishes shown visually", source: "delivery-platform data" },
] as const;

/* Old menu vs GoPlate */
const comparison: [string, string][] = [
  ["Guests guess from a list of words", "Guests spin the dish in 3D and place it on their table in AR"],
  ["Price changes mean reprinting", "Update from your phone — live for customers in seconds"],
  ["The QR opens a flat PDF", "The QR opens an interactive menu with photos, videos and 3D"],
  ["Orders wait for a busy waiter", "Guests order from their seat, straight to your kitchen (Pro)"],
  ["Platforms like this cost €79–797/mo", "From $2/month — and your first month is free"],
];

/* Looping product clips in phone frames ("see it, don't read it") */
const showcaseClips = [
  {
    src: "/showcase/film.mp4",
    poster: "/showcase/film-poster.jpg",
    title: "Film it once",
    body: "Walk your phone around the plate. GoPlate trims and polishes the clip into a loop like this — automatically.",
  },
  {
    src: "/showcase/explore.mp4",
    poster: "/showcase/explore-poster.jpg",
    title: "Customers crave it",
    body: "On the menu, every dish moves. Guests spin plates in 3D, watch the kitchen work, and stop ordering blind.",
  },
  {
    src: "/showcase/orders.mp4",
    poster: "/showcase/orders-poster.jpg",
    title: "Orders roll in",
    body: "On Pro, guests order right from the menu — and it lands on your kitchen's Orders screen in seconds.",
  },
];

const poppins = { fontFamily: "var(--font-poppins)" };

export default async function Home() {
  const { showcase, currency, dish3d } = await getLiveData();
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={poppins}>
      {/* ================= HERO ================= */}
      <header className="relative flex flex-col min-h-[100svh]">
        <div className="absolute inset-0">
          <Image
            src="/home-background.png"
            alt=""
            fill
            priority
            className="object-cover object-[72%_center]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(7,7,8,0.9) 0%, rgba(7,7,8,0.72) 34%, rgba(7,7,8,0.25) 62%, rgba(7,7,8,0.15) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{ background: "linear-gradient(to bottom, transparent, var(--navy-950))" }}
          />
          {/* Extra darkening on small screens where text overlaps the plate */}
          <div className="absolute inset-0 sm:hidden bg-black/45" />
        </div>

        {/* Nav */}
        <div className="relative z-30 max-w-[1400px] mx-auto w-full px-6 sm:px-10 pt-7">
          <NavBar />
        </div>

        {/* Hero body */}
        <div className="relative flex-1 max-w-[1400px] mx-auto w-full px-6 sm:px-10 flex items-center">
          <div className="max-w-[620px] py-16 rise">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Experience food like never before
            </p>
            <h1 className="mt-4 font-extrabold uppercase leading-[0.98] text-[15vw] sm:text-7xl lg:text-[92px] text-ink">
              3D Restaurant
              <br />
              <span className="text-accent">Menu</span>
            </h1>
            <p className="mt-7 text-lg sm:text-xl text-ink-dim leading-relaxed max-w-md">
              Immersive. Interactive. Delicious.
              <br />
              Explore our dishes in stunning 3D and see every detail before you order.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <Link
                href="/r/demo-bistro"
                className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-sm font-bold tracking-wider text-white"
                style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
              >
                EXPLORE DEMO MENU {icons.arrow}
              </Link>
              <a
                href="#for-restaurants"
                className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-sm font-bold tracking-wider text-ink border border-ink-faint/60 hover:border-ink-dim transition-colors"
              >
                HOW IT WORKS
                <span className="flex items-center justify-center h-7 w-7 rounded-full border border-ink-faint/60">
                  {icons.play}
                </span>
              </a>
            </div>

            {/* Mini features */}
            <div className="mt-14 flex flex-wrap gap-x-12 gap-y-6">
              {heroFeatures.map((f) => (
                <div key={f.title} className="flex flex-col items-center text-center gap-2.5 w-40">
                  <CircleIcon>{f.icon}</CircleIcon>
                  <div>
                    <p className="text-sm font-semibold text-ink">{f.title}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live dish showcase: real menu data, auto-cycling */}
        <HeroShowcase dishes={showcase} currency={currency} />

        {/* Journey strip */}
        <div className="relative max-w-[1400px] mx-auto w-full px-6 sm:px-10 pb-10">
          <div className="rounded-[28px] border border-white/10 bg-black/60 backdrop-blur-md px-6 py-7 grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
            {journey.map((j, i) => (
              <div
                key={j.title}
                className={`flex items-center gap-4 ${i > 0 ? "xl:border-l xl:border-white/10 xl:pl-7" : ""}`}
              >
                <CircleIcon size={52}>{j.icon}</CircleIcon>
                <div>
                  <p className="text-[15px] font-bold text-ink">{j.title}</p>
                  <p className="mt-1 text-xs leading-snug text-ink-faint max-w-[180px]">{j.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ================= PRODUCT PROMISES ================= */}
      <main className="max-w-[1400px] mx-auto w-full px-6 sm:px-10">
        <Reveal>
          <div className="mt-4 rounded-3xl border border-navy-700 bg-navy-900 px-8 py-8 grid gap-8 sm:grid-cols-3 text-center">
            {(
              [
                [0, "", "Apps your customers install"],
                [10, "s", "From QR scan to a 3D menu"],
                [30, "", "Days free on every new account"],
              ] as const
            ).map(([value, suffix, label]) => (
              <div key={label}>
                <p className="text-4xl sm:text-5xl font-extrabold text-accent">
                  <CountUp value={value} suffix={suffix} />
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-ink-faint">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ================= THE QUIET PROBLEM ================= */}
        <section className="pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">The quiet problem</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-ink max-w-2xl leading-tight">
              A menu of words is a menu of guesses
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {problems.map((p, i) => (
                <div key={p.title} className="rounded-2xl bg-navy-900 border border-navy-800 p-7">
                  <span className="text-xs font-extrabold tracking-widest text-ink-faint">0{i + 1}</span>
                  <h3 className="mt-3 text-lg font-bold text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm text-ink-dim leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ================= THE PAYOFF (industry-sourced) ================= */}
        <section className="pt-24">
          <Reveal>
            <div
              className="rounded-3xl border border-navy-700 px-8 py-12 relative overflow-hidden"
              style={{ background: "linear-gradient(140deg, var(--navy-900), #1c1712)" }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent text-center">
                What seeing the dish changes
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink text-center">
                People eat with their eyes first
              </h2>
              <div className="mt-10 grid gap-8 sm:grid-cols-3 text-center">
                {payoffStats.map((s) => (
                  <div key={s.label}>
                    <p className="text-4xl sm:text-5xl font-extrabold text-accent">
                      +<CountUp value={s.value} suffix="%" />
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">{s.label}</p>
                    <p className="mt-1 text-xs text-ink-faint">{s.source}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center text-xs text-ink-faint max-w-xl mx-auto">
                Independent industry research on visual and 3D/AR menus — results vary by venue, but the
                direction is always the same: dishes people can see, sell.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ================= FEATURES ================= */}
        <section id="features" className="pt-24 scroll-mt-10">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Why GoPlate</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-ink max-w-2xl leading-tight">
              Everything a modern menu should do
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl bg-navy-900 border border-navy-800 p-7 transition-colors hover:border-navy-700"
                >
                  <span className="block h-1 w-10 rounded-full" style={{ background: "var(--accent)" }} />
                  <h3 className="mt-4 text-xl font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink-dim leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ================= SEE IT IN ACTION (looping clips) ================= */}
        <section className="pt-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent text-center">
              See it in action
            </p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-ink text-center">
              Don&apos;t read it. <span className="text-accent">Watch it.</span>
            </h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {showcaseClips.map((clip) => (
                <div key={clip.title} className="text-center">
                  <PhoneVideo src={clip.src} poster={clip.poster} label={clip.title} />
                  <h3 className="mt-6 text-xl font-bold text-ink">{clip.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-ink-dim leading-relaxed">{clip.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ================= LIVE 3D DEMO ================= */}
        {dish3d && (
          <section className="pt-24">
            <Reveal>
              <div className="grid gap-10 lg:grid-cols-2 items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Try it yourself</p>
                  <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-ink leading-tight">
                    This is a real dish from a real menu
                  </h2>
                  <p className="mt-5 text-ink-dim leading-relaxed max-w-md">
                    “{dish3d.name}” lives on our demo restaurant&apos;s menu. Grab it, spin it, zoom
                    in — this is exactly what your customers see when they scan your QR code.
                  </p>
                  <Link
                    href="/r/demo-bistro"
                    className="mt-8 inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold tracking-wider text-white"
                    style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
                  >
                    OPEN THE FULL DEMO MENU {icons.arrow}
                  </Link>
                </div>
                <LiveDish3D
                  modelUrl={dish3d.modelUrl}
                  usdzUrl={dish3d.modelUsdzUrl || undefined}
                  poster={dish3d.imageUrl || undefined}
                  name={dish3d.name}
                />
              </div>
            </Reveal>
          </section>
        )}

        {/* ================= LIVE DEMO MENU PREVIEW ================= */}
        <section className="pt-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                  Live preview
                </p>
                <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-ink leading-tight">
                  This is what your customers see
                </h2>
                <p className="mt-5 text-ink-dim leading-relaxed max-w-md">
                  The phone next to this text is showing our demo restaurant&apos;s real menu, live
                  from the database — scroll it, open a dish, play a video. When a customer scans
                  your QR code, this exact experience opens in their browser. No app, no signup.
                </p>
                <Link
                  href="/r/demo-bistro"
                  className="mt-8 inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold tracking-wider text-ink border border-ink-faint/60 hover:border-ink-dim transition-colors"
                >
                  OPEN IT FULL SCREEN {icons.arrow}
                </Link>
              </div>

              {/* Phone frame running the live demo menu */}
              <div className="flex justify-center lg:justify-end">
                <div
                  className="relative w-[330px] max-w-full rounded-[46px] border border-navy-700 bg-navy-900 p-3"
                  style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}
                >
                  <div className="pointer-events-none absolute left-1/2 top-5 z-10 h-[22px] w-28 -translate-x-1/2 rounded-full bg-black" />
                  <iframe
                    src="/r/demo-bistro"
                    title="Live demo menu — exactly what customers see after scanning the QR code"
                    loading="lazy"
                    className="block w-full rounded-[34px] border-0"
                    style={{ height: 640, background: "var(--navy-950)" }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ================= FOR RESTAURANTS ================= */}
        <section id="for-restaurants" className="pt-24 pb-24 scroll-mt-10">
          <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">For restaurants</p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-ink leading-tight">
            Three steps. One afternoon. <span className="text-accent">Live tonight.</span>
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-2xl bg-navy-900 border border-navy-800 p-7">
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center font-extrabold text-white mb-4"
                  style={{ background: i === 1 ? "var(--sky)" : "var(--accent)" }}
                >
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">{step.title}</h3>
                <p className="text-sm text-ink-dim leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>

          {/* Old menu vs GoPlate */}
          <div className="mt-20">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink text-center">
              Same kitchen. Same dishes. <span className="text-accent">A different night.</span>
            </h2>
            <div className="mt-10 overflow-x-auto">
              <div className="min-w-[560px] rounded-3xl border border-navy-700 overflow-hidden">
                <div className="grid grid-cols-2 text-sm">
                  <div className="bg-navy-900 px-6 py-4 font-bold text-ink-faint uppercase tracking-wider text-xs border-b border-navy-800">
                    The old menu
                  </div>
                  <div className="px-6 py-4 font-bold uppercase tracking-wider text-xs border-b border-navy-800 text-white" style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}>
                    With GoPlate
                  </div>
                  {comparison.map(([oldWay, newWay], i) => (
                    <div key={i} className="contents">
                      <div className={`bg-navy-900 px-6 py-4 text-ink-faint ${i < comparison.length - 1 ? "border-b border-navy-800" : ""}`}>
                        {oldWay}
                      </div>
                      <div className={`bg-navy-800/60 px-6 py-4 text-ink-dim font-medium ${i < comparison.length - 1 ? "border-b border-navy-800" : ""}`}>
                        <span className="mr-2 text-accent" aria-hidden>✓</span>
                        {newWay}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* App CTA */}
          <div
            className="mt-14 rounded-3xl border border-navy-700 p-10 sm:p-14 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(140deg, var(--navy-900), var(--navy-800))" }}
          >
            <Image src="/app-logo.png" alt="" width={84} height={84} className="mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">Run your menu from your pocket</h2>
            <p className="mt-3 text-ink-dim max-w-lg mx-auto">
              The GoPlate app for restaurant owners: build your menu, film your dishes, customize how
              it looks, and print your QR code — all from your phone.
            </p>
            <p className="mt-8 inline-block rounded-full border border-navy-700 px-6 py-3 text-sm text-ink-dim">
              Coming soon to Google Play
            </p>
          </div>
          </Reveal>
        </section>

      </main>

      {/* ================= FOOTER ================= */}
      <footer id="contact" className="mt-auto border-t border-navy-800 px-6 py-10 text-center text-sm text-ink-faint">
        <p className="flex items-center justify-center gap-2.5 text-ink-dim">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
          <span className="font-extrabold text-ink">
            <span className="text-accent">Go</span>Plate
          </span>
        </p>
        <p className="mt-3">Interactive 3D menus for restaurants</p>
        <p className="mt-2">
          <Link href="/plans" className="hover:text-ink-dim transition-colors underline underline-offset-4">
            Plans &amp; pricing
          </Link>
          <span className="mx-3">·</span>
          <Link href="/privacy" className="hover:text-ink-dim transition-colors underline underline-offset-4">
            Privacy policy
          </Link>
        </p>
      </footer>
    </div>
  );
}
