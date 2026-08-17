"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getToken, setToken } from "@/lib/portal";
import { Btn, ErrorNote, Field, PasswordInput, inputCls } from "@/components/portal/ui";
import { AuthDivider, GoogleButton } from "@/components/portal/GoogleButton";

/** `googleClientId` is resolved on the server; empty means Google is unconfigured. */
export function LoginClient({ googleClientId = "" }: { googleClientId?: string }) {
  const router = useRouter();
  // Set by the reset flow so a finished reset lands on a confirmation, not a
  // bare sign-in form that gives no sign anything happened.
  const justReset = useSearchParams().get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Already signed in? Straight to the dashboard.
  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  // A first-time Google account still needs a restaurant, so it lands on
  // sign-up step 2 rather than an empty dashboard.
  const signInWithGoogle = async (credential: string) => {
    setBusy(true);
    setError("");
    try {
      const { token, isNew } = await api.googleSignIn(credential);
      setToken(token);
      router.replace(isNew ? "/register?step=restaurant" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await api.login(email.trim(), password);
      setToken(token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[760px] rounded-full blur-[130px]" style={{ background: "rgba(240,118,46,0.12)" }} />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-2.5">
            <Image src="/logo.png" alt="GoPlate" width={44} height={44} priority className="rounded-xl" />
            <span className="text-2xl font-extrabold tracking-wide text-ink">
              <span className="text-accent">Go</span>Plate
            </span>
          </Link>
          <h1 className="mt-8 text-center text-3xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-2 text-center text-sm text-ink-dim">Sign in to manage your menu.</p>

          {justReset && (
            <p
              className="mt-6 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "rgba(123,178,106,0.14)", color: "#8fc47d" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0">
                <path d="m4 12.5 5 5L20 6.5" />
              </svg>
              Password updated. Sign in with your new password.
            </p>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4 rounded-[24px] border border-navy-700 bg-navy-900 p-7 sm:p-8">
            {googleClientId && (
              <>
                <GoogleButton
                  clientId={googleClientId}
                  onCredential={signInWithGoogle}
                  text="signin_with"
                />
                <AuthDivider />
              </>
            )}
            <Field label="Email">
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" className={inputCls} />
            </Field>
            <Field label="Password">
              <PasswordInput value={password} onChange={setPassword} required />
            </Field>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-semibold text-ink-dim hover:text-accent">
                Forgot your password?
              </Link>
            </div>
            <ErrorNote message={error} />
            <Btn type="submit" loading={busy} className="w-full">Sign in</Btn>
            <p className="text-center text-xs text-ink-faint">
              New to GoPlate?{" "}
              <Link href="/register" className="font-semibold text-accent">Create your account</Link>{" "}
              — first month free.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
