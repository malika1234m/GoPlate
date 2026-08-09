"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const NAV = [
  ["Home", "/"],
  ["Features", "#features"],
  ["For Restaurants", "#for-restaurants"],
  ["Plans & Pricing", "/plans"],
  ["Contact", "#contact"],
] as const;

function BrandLogo() {
  return (
    <Image
      src="/logo.png"
      alt="GoPlate logo"
      width={42}
      height={42}
      priority
      className="rounded-xl"
    />
  );
}

export function NavBar() {
  const [open, setOpen] = useState(false);

  const linkEl = (label: string, href: string, i: number, mobile = false) => {
    const base = mobile
      ? "block py-3 text-base border-b border-white/10"
      : "text-[15px]";
    const cls =
      i === 0 && !mobile
        ? `${base} text-ink font-semibold border-b-2 pb-1`
        : `${base} text-ink-dim hover:text-ink transition-colors`;
    const style = i === 0 && !mobile ? { borderColor: "var(--accent)" } : undefined;
    return href.startsWith("#") ? (
      <a key={label} href={href} className={cls} style={style} onClick={() => setOpen(false)}>
        {label}
      </a>
    ) : (
      <Link key={label} href={href} className={cls} style={style} onClick={() => setOpen(false)}>
        {label}
      </Link>
    );
  };

  return (
    <nav className="relative">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <span className="flex items-center gap-2.5 shrink-0">
          <BrandLogo />
          <span className="text-[19px] sm:text-[22px] font-extrabold tracking-wide text-ink">
            <span className="text-accent">Go</span>Plate
          </span>
        </span>

        <div className="hidden lg:flex items-center gap-9">
          {NAV.map(([label, href], i) => linkEl(label, href, i))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-block rounded-full border border-white/25 px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold tracking-wide text-ink whitespace-nowrap hover:border-white/50 transition-colors"
          >
            SIGN IN
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold tracking-wide text-white whitespace-nowrap"
            style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
          >
            {/* "FREE" is dropped below sm: the full label plus the logo, burger and
                gaps needs 371px, which overflows every phone narrower than 419px. */}
            <span className="sm:hidden">GET STARTED</span>
            <span className="hidden sm:inline">GET STARTED FREE</span>
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full mt-3 z-50 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-md px-5 py-2">
          {NAV.map(([label, href], i) => linkEl(label, href, i, true))}
          {/* SIGN IN is hidden below sm in the bar, so it lives here or nowhere */}
          <Link
            href="/login"
            className="block py-3 text-base text-ink-dim hover:text-ink transition-colors sm:hidden"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
        </div>
      )}
    </nav>
  );
}
