import Link from "next/link";
import QRCode from "qrcode";

/**
 * "Scan to taste the demo" — the QR is generated on the server at request time,
 * not pasted in as an image.
 *
 * A screenshotted or AI-drawn QR is the classic way this section goes stale or
 * silently stops scanning; generating it from `appUrl()` means it always points
 * at the live demo menu, even if the domain changes.
 *
 * Rendered as an inline SVG data URI so it stays razor sharp at any size and
 * costs no extra request.
 */
export async function DemoQr({ appUrl }: { appUrl: string }) {
  const target = `${appUrl.replace(/\/+$/, "")}/r/demo-bistro`;

  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    // High correction so it still reads if a phone camera catches it at an
    // angle, or a visitor photographs the screen rather than scanning it.
    errorCorrectionLevel: "H",
    color: { dark: "#070708", light: "#ffffff" },
  });

  return (
    <section className="pt-24">
      <div className="rounded-[28px] border border-navy-700 bg-navy-900 p-8 sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_auto]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              See it for real
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              Don&apos;t take our word for it. <span className="text-accent">Taste it.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink-dim">
              Point your phone camera at the code to open a live GoPlate menu — the same one your
              customers would see. Open a dish, spin it, and on iPhone or iPad tap{" "}
              <span className="font-semibold text-ink">View on your table</span> to drop it into the
              room in front of you. No app, nothing to install.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/r/demo-bistro"
                className="inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-bold tracking-wide text-white"
                style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
              >
                Open the demo menu
              </Link>
              {/* Anyone on a laptop cannot scan their own screen — say so
                  rather than leaving them staring at a code they can't use. */}
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                or scan on your phone
              </span>
            </div>
          </div>

          <div className="justify-self-start lg:justify-self-end">
            <div className="rounded-3xl border border-navy-700 bg-navy-800 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                alt="QR code that opens the GoPlate demo menu"
                width={220}
                height={220}
                className="h-[220px] w-[220px] rounded-xl bg-white p-2"
              />
              <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                Scan to taste the demo
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
