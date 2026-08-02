"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/portal/AuthShell";
import { Btn, ErrorNote, Field, FieldError, inputCls } from "@/components/portal/ui";

type LinkState =
  | { status: "checking" }
  | { status: "valid"; email: string }
  | { status: "invalid" };

/** Cheap, honest strength read — length first, then variety. */
function strengthOf(password: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (password.length < 8) return { score: 0, label: "Too short", color: "#ef6a58" };
  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  if (password.length >= 12 && variety >= 3) return { score: 3, label: "Strong", color: "#7bb26a" };
  if (password.length >= 10 || variety >= 3) return { score: 2, label: "Good", color: "#e8a02a" };
  return { score: 1, label: "Weak", color: "#ef6a58" };
}

export function ResetPasswordClient() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  // A missing token is knowable without asking the server, so it's derived
  // here rather than set from inside the effect.
  const [link, setLink] = useState<LinkState>(
    token ? { status: "checking" } : { status: "invalid" }
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Check the link before showing the form, so an expired one is explained up
  // front rather than after the owner has typed a new password twice.
  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setLink(d?.valid ? { status: "valid", email: d.email } : { status: "invalid" });
      })
      .catch(() => active && setLink({ status: "invalid" }));
    return () => {
      active = false;
    };
  }, [token]);

  const strength = strengthOf(password);
  const passwordError = touched && password.length < 8 ? "Use at least 8 characters." : "";
  const confirmError = touched && confirm !== password ? "Passwords don't match." : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (password.length < 8 || confirm !== password) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not reset your password.");
      router.replace("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
      setBusy(false);
    }
  };

  if (link.status === "checking") {
    return (
      <AuthShell title="Checking your link…">
        <div className="flex items-center justify-center py-6">
          <span className="h-8 w-8 rounded-full border-2 border-navy-700 border-t-accent animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (link.status === "invalid") {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="Reset links work once and last an hour. Request a fresh one and we'll email it straight over."
        footer={
          <Link href="/login" className="font-semibold text-accent">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(224,82,63,0.12)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef6a58" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.2v.3" />
            </svg>
          </span>
          <p className="mt-5 text-sm leading-relaxed text-ink-dim">
            Nothing has changed on your account — your current password still works.
          </p>
          <Link href="/forgot-password" className="mt-6 w-full">
            <Btn className="w-full">Send me a new link</Btn>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        <>
          You&apos;re resetting the password for{" "}
          <span className="font-semibold text-ink">{link.email}</span>.
        </>
      }
      footer={
        <Link href="/login" className="font-semibold text-accent">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password">
          <div className="relative">
            <input
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`${inputCls} pr-24`}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wide text-ink-faint hover:text-ink"
            >
              {reveal ? "Hide" : "Show"}
            </button>
          </div>
          <FieldError message={passwordError} />
          {password && !passwordError && (
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="flex h-1.5 flex-1 gap-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      background: i <= strength.score ? strength.color : "var(--navy-700)",
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
        </Field>

        <Field label="Confirm new password">
          <input
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your new password"
            className={inputCls}
          />
          <FieldError message={confirmError} />
        </Field>

        <ErrorNote message={error} />

        <Btn type="submit" loading={busy} className="w-full">
          Save new password
        </Btn>

        <p className="text-center text-xs leading-relaxed text-ink-faint">
          For your security this signs you out of GoPlate everywhere, including the mobile app.
        </p>
      </form>
    </AuthShell>
  );
}
