"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/portal/AuthShell";
import { Btn, ErrorNote, Field, inputCls } from "@/components/portal/ui";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={
          <>
            If an account exists for <span className="font-semibold text-ink">{email.trim()}</span>,
            we&apos;ve sent a link to reset your password.
          </>
        }
        footer={
          <Link href="/login" className="font-semibold text-accent">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(240,118,46,0.14)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          <p className="mt-5 text-sm leading-relaxed text-ink-dim">
            The link works once and expires in an hour. If it doesn&apos;t arrive in a couple of
            minutes, check your spam folder.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setError("");
            }}
            className="mt-5 text-sm font-semibold text-accent"
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we'll send you a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-accent">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@restaurant.com"
            className={inputCls}
          />
        </Field>
        <ErrorNote message={error} />
        <Btn type="submit" loading={busy} className="w-full">
          Send reset link
        </Btn>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Your menu stays live for customers the whole time — resetting your password only affects
          signing in.
        </p>
      </form>
    </AuthShell>
  );
}
