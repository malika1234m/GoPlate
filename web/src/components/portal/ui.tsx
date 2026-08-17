"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { setToken } from "@/lib/portal";

/* ---------- Small shared primitives for the owner portal ---------- */

export function Btn({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  loading,
  small,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  className?: string;
}) {
  const base = `inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all disabled:opacity-50 ${
    small ? "px-4 py-2 text-xs" : "px-6 py-3 text-sm"
  } ${className}`;
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "linear-gradient(100deg, var(--accent), #f5934f)", color: "#fff" },
    secondary: { border: "1px solid var(--navy-700)", color: "var(--ink)" },
    ghost: { color: "var(--ink-dim)" },
    danger: { background: "rgba(224,82,63,0.12)", color: "#ef6a58", border: "1px solid rgba(224,82,63,0.3)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={base} style={styles[variant]}>
      {loading && (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-sm text-ink outline-none focus:border-accent placeholder:text-ink-faint/60";

/**
 * Password field with a show/hide toggle.
 *
 * Owners type these on phones, where a mistyped character is invisible and the
 * only feedback is a failed sign-in. Being able to check what you typed removes
 * most of that guesswork.
 *
 * The toggle is a `button type="button"` on purpose — inside a form, a bare
 * <button> submits it, which would fire a sign-in attempt on every peek.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  required,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
  invalid?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // Room on the right so long passwords never run under the toggle.
        className={`${inputCls} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-ink-faint transition-colors hover:text-ink"
      >
        {shown ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3" />
            <path d="m4 20 16-16" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

/** Inline validation message under a field. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-semibold" style={{ color: "#ef6a58" }}>{message}</p>;
}

const CURRENCIES = [
  ["LKR", "Sri Lankan Rupee"],
  ["USD", "US Dollar"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
  ["INR", "Indian Rupee"],
  ["AUD", "Australian Dollar"],
  ["AED", "UAE Dirham"],
  ["SGD", "Singapore Dollar"],
  ["MYR", "Malaysian Ringgit"],
  ["JPY", "Japanese Yen"],
  ["CAD", "Canadian Dollar"],
] as const;

export function CurrencySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // A currency already saved but not in our shortlist still shows correctly.
  const known = CURRENCIES.some(([code]) => code === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
      {!known && value && <option value={value}>{value}</option>}
      {CURRENCIES.map(([code, label]) => (
        <option key={code} value={code}>
          {code} — {label}
        </option>
      ))}
    </select>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(224,82,63,0.12)", color: "#ef6a58" }}>
      {message}
    </p>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="h-8 w-8 rounded-full border-2 border-navy-700 border-t-accent animate-spin" />
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6">
      <div
        className={`w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-navy-700 bg-navy-900 p-6 sm:p-8`}
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-extrabold text-ink">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-navy-700 text-ink-dim hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

/** Confirm dialog (replaces window.confirm with brand styling). */
export function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-ink-dim leading-relaxed">{body}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}

/* ---------- Portal chrome ---------- */

export function PortalHeader({ active }: { active?: "dashboard" | "account" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-[color-mix(in_srgb,var(--navy-950,#0a0e1a)_88%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="GoPlate" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-extrabold tracking-wide text-ink">
            <span className="text-accent">Go</span>Plate
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/dashboard"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${active === "dashboard" ? "text-accent" : "text-ink-dim hover:text-ink"}`}
          >
            Dashboard
          </Link>
          <Link
            href="/account"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${active === "account" ? "text-accent" : "text-ink-dim hover:text-ink"}`}
          >
            Plan &amp; billing
          </Link>
          <button
            onClick={() => {
              setToken(null);
              window.location.href = "/login";
            }}
            className="rounded-full border border-navy-700 px-4 py-2 text-sm font-semibold text-ink-dim hover:text-ink"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
