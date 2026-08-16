"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getToken, setToken } from "@/lib/portal";
import { Btn, CurrencySelect, ErrorNote, Field, FieldError, inputCls } from "@/components/portal/ui";
import { AuthDivider, GoogleButton, googleSignInAvailable } from "@/components/portal/GoogleButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Two-step sign-up, matching the mobile app: 1) the account,
 * 2) the restaurant. Categories come next on the dashboard.
 */
export function RegisterClient() {
  const router = useRouter();
  // Set when sign-up happened on the sign-in page through Google: the account
  // exists and is signed in, only the restaurant is missing.
  const fromGoogle = useSearchParams().get("step") === "restaurant";
  const [step, setStep] = useState<1 | 2>(fromGoogle ? 2 : 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  // Step 1 — account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2 — restaurant
  const [rName, setRName] = useState("");
  const [rDescription, setRDescription] = useState("");
  const [rAddress, setRAddress] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rCurrency, setRCurrency] = useState("LKR");

  useEffect(() => {
    // Step 2 is reached holding a token by design — only bounce the signed-in
    // owner away when they land on the account step.
    if (getToken() && !fromGoogle && step === 1) router.replace("/dashboard");
  }, [router, fromGoogle, step]);

  const signUpWithGoogle = async (credential: string) => {
    setBusy(true);
    setError("");
    try {
      const { token, isNew } = await api.googleSignIn(credential);
      setToken(token);
      // Already had an account — nothing to set up, go straight in.
      if (!isNew) router.replace("/dashboard");
      else setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up with Google.");
    } finally {
      setBusy(false);
    }
  };

  const validateAccount = (): boolean => {
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Enter your name.";
    if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address, like you@restaurant.com.";
    if (password.trim().length < 8) errs.password = "Use at least 8 characters.";
    else if (confirm && password.trim() !== confirm.trim()) errs.confirm = "Passwords do not match.";
    if (!confirm.trim()) errs.confirm = errs.confirm ?? "Re-enter your password to confirm.";
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateAccount()) return;
    setBusy(true);
    try {
      const { token } = await api.register(name.trim(), email.trim(), password.trim());
      setToken(token);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const submitRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rName.trim().length < 2) {
      setFieldErr({ rName: "Enter your restaurant's name." });
      return;
    }
    setFieldErr({});
    setBusy(true);
    try {
      const { restaurant } = await api.createRestaurant({
        name: rName.trim(),
        description: rDescription.trim(),
        address: rAddress.trim(),
        phone: rPhone.trim(),
        currency: rCurrency.trim().toUpperCase() || "USD",
      });
      router.replace(`/dashboard/${restaurant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the restaurant.");
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

          {/* Step indicator */}
          <div className="mt-8 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider">
            <span className={step === 1 ? "text-accent" : "text-ink-faint"}>1 · Your account</span>
            <span className="h-px w-8 bg-navy-700" aria-hidden />
            <span className={step === 2 ? "text-accent" : "text-ink-faint"}>2 · Your restaurant</span>
          </div>

          {step === 1 ? (
            <>
              <h1 className="mt-6 text-center text-3xl font-extrabold text-ink">Start your free month</h1>
              <p className="mt-2 text-center text-sm text-ink-dim">Full access for 30 days. No card needed.</p>
              <form onSubmit={submitAccount} className="mt-8 space-y-4 rounded-[24px] border border-navy-700 bg-navy-900 p-7 sm:p-8">
                {googleSignInAvailable() && (
                  <>
                    <GoogleButton onCredential={signUpWithGoogle} text="signup_with" />
                    <AuthDivider />
                  </>
                )}
                <Field label="Your name">
                  <input required value={name} onChange={(e) => { setName(e.target.value); setFieldErr((f) => ({ ...f, name: "" })); }} placeholder="Alex Chef" className={inputCls} autoComplete="name" aria-invalid={!!fieldErr.name} />
                  <FieldError message={fieldErr.name} />
                </Field>
                <Field label="Email">
                  <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setFieldErr((f) => ({ ...f, email: "" })); }} placeholder="you@restaurant.com" className={inputCls} autoComplete="email" aria-invalid={!!fieldErr.email} />
                  <FieldError message={fieldErr.email} />
                </Field>
                <Field label="Password" hint={fieldErr.password ? undefined : "At least 8 characters."}>
                  <input type="password" required value={password} onChange={(e) => { setPassword(e.target.value); setFieldErr((f) => ({ ...f, password: "" })); }} placeholder="••••••••" className={inputCls} autoComplete="new-password" aria-invalid={!!fieldErr.password} />
                  <FieldError message={fieldErr.password} />
                </Field>
                <Field label="Confirm password">
                  <input type="password" required value={confirm} onChange={(e) => { setConfirm(e.target.value); setFieldErr((f) => ({ ...f, confirm: "" })); }} placeholder="Re-enter your password" className={inputCls} autoComplete="new-password" aria-invalid={!!fieldErr.confirm} />
                  <FieldError message={fieldErr.confirm} />
                </Field>
                <ErrorNote message={error} />
                <Btn type="submit" loading={busy} className="w-full">Continue</Btn>
                <p className="text-center text-xs text-ink-faint">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-accent">Sign in</Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-center text-3xl font-extrabold text-ink">About your restaurant</h1>
              <p className="mt-2 text-center text-sm text-ink-dim">This becomes your public menu page — you can change everything later.</p>
              <form onSubmit={submitRestaurant} className="mt-8 space-y-4 rounded-[24px] border border-navy-700 bg-navy-900 p-7 sm:p-8">
                <Field label="Restaurant name">
                  <input required value={rName} onChange={(e) => { setRName(e.target.value); setFieldErr((f) => ({ ...f, rName: "" })); }} placeholder="The Copper Kettle" className={inputCls} aria-invalid={!!fieldErr.rName} />
                  <FieldError message={fieldErr.rName} />
                </Field>
                <Field label="Short description (optional)">
                  <input value={rDescription} onChange={(e) => setRDescription(e.target.value)} placeholder="Slow food, open fire." className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone (optional)">
                    <input value={rPhone} onChange={(e) => setRPhone(e.target.value)} placeholder="+94 77 123 4567" className={inputCls} />
                  </Field>
                  <Field label="Currency" hint="Shown next to every price on your menu.">
                    <CurrencySelect value={rCurrency} onChange={setRCurrency} />
                  </Field>
                </div>
                <Field label="Address (optional)">
                  <input value={rAddress} onChange={(e) => setRAddress(e.target.value)} placeholder="12 Market Lane" className={inputCls} />
                </Field>
                <ErrorNote message={error} />
                <Btn type="submit" loading={busy} className="w-full">Create my restaurant</Btn>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
