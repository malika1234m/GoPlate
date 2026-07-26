import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us — GoPlate",
  description:
    "GoPlate is built in Colombo, Sri Lanka by undergraduates of the University of Colombo, on a mission to let every restaurant show its food the way it really looks.",
};

const beliefs: { title: string; body: string }[] = [
  {
    title: "Menus should look like the food",
    body: "A paper menu can’t make anyone hungry. A photoreal 3D dish that a customer can spin, zoom, and place on their own table in AR gets closer to the moment the plate arrives — and that moment is what sells.",
  },
  {
    title: "Zero friction for guests",
    body: "Nobody wants to install an app to read a menu. Guests scan one QR code and the menu opens in their browser, instantly. All of the technology lives on the restaurant’s side.",
  },
  {
    title: "Priced for every restaurant",
    body: "We started with the rice-and-curry place down the road in mind, not just fine dining. GoPlate plans start at a few dollars a month, and everything is built to work on an ordinary phone — filming a dish is a slow walk around the plate, nothing more.",
  },
  {
    title: "Your food, your data",
    body: "Photos, videos, and 3D models belong to the restaurant that made them. We don’t sell data, we don’t run ads, and we don’t use your dishes to train AI models. Our only business is making your menu irresistible.",
  },
];

export default function About() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-ink-faint hover:text-ink-dim transition-colors">
        ← GoPlate
      </Link>
      <h1 className="mt-6 text-4xl text-ink" style={{ fontFamily: "var(--font-fraunces)" }}>
        About us
      </h1>

      <section className="mt-8 space-y-4 text-ink-dim leading-relaxed">
        <p>
          GoPlate is built in Colombo, Sri Lanka, by a small team of undergraduates from the{" "}
          <span className="text-ink">University of Colombo</span>. We started with a simple
          observation from the restaurants around us: the food is spectacular, but the menu — a
          laminated card, a faded photo, a PDF — does none of it justice.
        </p>
        <p>
          Meanwhile, the technology to fix that had quietly become accessible. Photogrammetry can
          turn a one-minute phone video into a photoreal 3D model. Every modern phone can show that
          model in AR, sitting on the customer’s own table. And every guest already carries a QR
          scanner in their pocket. What was missing was a product that stitched those pieces
          together simply enough that a busy kitchen could actually use it.
        </p>
        <p>
          So we built GoPlate: film a slow circle around a dish, and minutes later it’s live on
          your menu in 3D. Print one QR code for your tables. If you want, let guests build their
          order right on the menu and watch it land on your kitchen’s Orders screen — payment stays
          at your counter, the way you already work.
        </p>
        <p>
          We are proudly a student-built company. That means we move fast, we answer our own
          support email, and every rupee a restaurant pays us goes back into making the product
          better.
        </p>
      </section>

      <h2 className="mt-12 text-xl text-ink" style={{ fontFamily: "var(--font-fraunces)" }}>
        What we believe
      </h2>
      <div className="mt-4 space-y-8">
        {beliefs.map((b) => (
          <section key={b.title}>
            <h3 className="text-ink mb-1 font-semibold">{b.title}</h3>
            <p className="text-ink-dim leading-relaxed">{b.body}</p>
          </section>
        ))}
      </div>

      <h2 className="mt-12 text-xl text-ink" style={{ fontFamily: "var(--font-fraunces)" }}>
        Say hello
      </h2>
      <p className="mt-3 text-ink-dim leading-relaxed">
        Whether you run a single café or a chain, we’d love to show you what your dishes look like
        in 3D — the first 30 days are free, no card required. Questions, ideas, or just curious?
        Email us at{" "}
        <a
          href="mailto:malikanishnatha4@gmail.com"
          className="text-ink underline underline-offset-4 hover:text-ink-dim transition-colors"
        >
          malikanishnatha4@gmail.com
        </a>{" "}
        or explore the{" "}
        <Link href="/r/demo-bistro" className="text-ink underline underline-offset-4 hover:text-ink-dim transition-colors">
          live demo menu
        </Link>
        .
      </p>

      <p className="mt-12 text-sm text-ink-faint">
        See also our{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-ink-dim transition-colors">
          Privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-ink-dim transition-colors">
          Terms of service
        </Link>
        .
      </p>
    </main>
  );
}
