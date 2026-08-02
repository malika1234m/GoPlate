import Image from "next/image";
import Link from "next/link";

/**
 * Centred, branded frame shared by the signed-out auth screens so sign-in,
 * forgot-password and reset-password read as one flow.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[760px] rounded-full blur-[130px]"
          style={{ background: "rgba(240,118,46,0.12)" }}
        />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-2.5">
            <Image src="/logo.png" alt="GoPlate" width={44} height={44} priority className="rounded-xl" />
            <span className="text-2xl font-extrabold tracking-wide text-ink">
              <span className="text-accent">Go</span>Plate
            </span>
          </Link>

          <h1 className="mt-8 text-center text-3xl font-extrabold text-ink">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-dim">{subtitle}</p>
          )}

          <div className="mt-8 rounded-[24px] border border-navy-700 bg-navy-900 p-7 sm:p-8">
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-ink-faint">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
