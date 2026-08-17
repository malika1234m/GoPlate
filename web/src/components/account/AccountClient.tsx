"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthDivider, GoogleButton } from "@/components/portal/GoogleButton";
import { PasswordInput } from "@/components/portal/ui";
import { UpgradeRequestPanel, SupportPanel } from "@/components/account/OwnerRequests";

/**
 * Owner-facing web billing. Subscriptions are handled here (on the web),
 * not inside the mobile app — this keeps the Android app clear of Google
 * Play's payments policy for digital subscriptions. Auth reuses the same
 * Bearer-token API the app uses; the token lives in localStorage.
 */

type Plan = "basic" | "starter" | "pro";

type Billing = {
  plan: Plan;
  label: string;
  limits: { maxRestaurants: number; maxModels: number; maxVideos: number };
  usage: { restaurants: number; models: number; videos: number };
  subscribed: boolean;
  trialDaysLeft: number;
  accessActive: boolean;
  billingConfigured: boolean;
};

const TOKEN_KEY = "goplate_token";

const PLAN_CARDS: {
  id: Plan;
  name: string;
  price: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
}[] = [
  {
    id: "basic",
    name: "Basic",
    price: "$2",
    tagline: "Your menu, live and looking good",
    features: ["1 restaurant", "Unlimited dishes & photos", "2 dish videos", "2 photoreal 3D models", "QR code & custom themes"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$12",
    tagline: "Bring your best dishes to life",
    highlight: true,
    features: ["Everything in Basic", "Up to 10 dish videos", "Up to 10 photoreal 3D models", "AR — dishes on the table"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    tagline: "The full 3D experience, plus live ordering",
    features: ["Everything in Starter", "Unlimited videos & 3D models", "Live table ordering", "Kitchen orders screen", "Up to 10 restaurants"],
  },
];

const tick = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** `googleClientId` is resolved on the server; empty means Google is unconfigured. */
export function AccountClient({ googleClientId = "" }: { googleClientId?: string }) {
  const [token, setToken] = useState<string | null>(null);
  // Shared between the plan cards and the request form below them.
  const [requestPlan, setRequestPlan] = useState<Plan>("starter");
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const loadBilling = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing", { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setBilling(null);
        return;
      }
      const data = await res.json();
      setBilling(data);
    } catch {
      setError("Couldn't load your plan. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved session on mount, then fetch
      setToken(t);
      loadBilling(t);
    } else {
      setLoading(false);
    }
  }, [loadBilling]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not sign in.");
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
      await loadBilling(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setSigningIn(false);
    }
  };

  /**
   * Google sign-in for the billing page. Without it an owner who signed up with
   * Google could never reach their own subscription: they have no password, so
   * the form above can only ever reject them.
   */
  const signInWithGoogle = async (credential: string) => {
    setSigningIn(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not sign in with Google.");
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      await loadBilling(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setBilling(null);
  };

  const upgrade = async (plan: Plan) => {
    if (!token) return;
    setWorking(plan);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      if (data.url) window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setWorking(null);
    }
  };

  const manage = async () => {
    if (!token) return;
    setWorking("portal");
    setError("");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open the billing portal.");
      if (data.url) window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the billing portal.");
      setWorking(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[760px] rounded-full blur-[130px]" style={{ background: "rgba(240,118,46,0.12)" }} />
        <div className="absolute bottom-0 -right-40 h-[360px] w-[480px] rounded-full blur-[130px]" style={{ background: "rgba(63,169,224,0.07)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-[1100px] mx-auto w-full px-6 sm:px-10 pt-7 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="GoPlate logo" width={38} height={38} priority className="rounded-xl" />
          <span className="text-xl font-extrabold tracking-wide text-ink">
            <span className="text-accent">Go</span>Plate
          </span>
        </Link>
        {token && (
          <button onClick={signOut} className="rounded-full border border-navy-700 px-5 py-2.5 text-sm font-semibold text-ink-dim hover:text-ink transition-colors">
            Sign out
          </button>
        )}
      </header>

      <main className="relative z-10 max-w-[1100px] mx-auto w-full px-6 sm:px-10 flex-1 pb-24">
        {error && (
          <p className="mt-6 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(224,82,63,0.12)", color: "#ef6a58" }}>
            {error}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-40">
            <span className="h-8 w-8 rounded-full border-2 border-navy-700 border-t-accent animate-spin" />
          </div>
        )}

        {/* Logged out: sign-in */}
        {!loading && !token && (
          <section className="pt-16 sm:pt-24 max-w-md mx-auto">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">Manage your plan</h1>
              <p className="mt-3 text-ink-dim">Sign in with your GoPlate owner account to view or change your subscription.</p>
            </div>
            <form onSubmit={signIn} className="mt-10 rounded-[24px] border border-navy-700 bg-navy-900 p-7 sm:p-8 space-y-4">
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
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@restaurant.com"
                  className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Password</label>
                <div className="mt-2">
                  <PasswordInput value={password} onChange={setPassword} required />
                </div>
              </div>
              <button
                type="submit"
                disabled={signingIn}
                className="w-full rounded-full py-3.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
              >
                {signingIn ? "Signing in…" : "Sign in"}
              </button>
              <p className="text-center text-xs text-ink-faint">
                Use the same email and password as the GoPlate app. New here?{" "}
                <Link href="/register" className="text-accent">Create your account</Link> — first month free.
              </p>
            </form>
          </section>
        )}

        {/* Logged in: plan status + management */}
        {!loading && token && billing && (
          <section className="pt-12 sm:pt-16">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">Your plan</h1>

            {/* Status card */}
            <div className="mt-6 rounded-[24px] border border-navy-700 bg-navy-900 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-ink-faint">Current plan</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">
                    {billing.label}
                    {billing.subscribed ? (
                      <span className="ml-3 align-middle rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">Active</span>
                    ) : billing.accessActive ? (
                      <span className="ml-3 align-middle rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-400">
                        Free trial — {billing.trialDaysLeft} day{billing.trialDaysLeft === 1 ? "" : "s"} left
                      </span>
                    ) : (
                      <span className="ml-3 align-middle rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">Trial ended</span>
                    )}
                  </p>
                </div>
                {billing.subscribed && (
                  <button
                    onClick={manage}
                    disabled={working === "portal"}
                    className="rounded-full border border-navy-700 px-6 py-3 text-sm font-bold text-ink hover:border-accent transition-colors disabled:opacity-60"
                  >
                    {working === "portal" ? "Opening…" : "Manage subscription"}
                  </button>
                )}
              </div>

              {!billing.accessActive && (
                <p className="mt-4 rounded-xl bg-navy-800 px-4 py-3 text-sm text-ink-dim">
                  Your free month has ended. Choose a plan below to keep editing — your published menu stays live for
                  customers either way.
                </p>
              )}

              {/* Usage */}
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Restaurants", used: billing.usage.restaurants, max: billing.limits.maxRestaurants },
                  { label: "3D models", used: billing.usage.models, max: billing.limits.maxModels },
                  { label: "Videos", used: billing.usage.videos, max: billing.limits.maxVideos },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-navy-800 bg-navy-800/50 py-4">
                    <p className="text-2xl font-extrabold text-ink">
                      {m.used}
                      <span className="text-sm font-medium text-ink-faint"> / {m.max === -1 ? "∞" : m.max}</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {!billing.billingConfigured && (
              <UpgradeRequestPanel
                token={token}
                selectedPlan={requestPlan}
                onSelectPlan={setRequestPlan}
              />
            )}

            {/* Plan chooser */}
            <h2 className="mt-14 text-2xl font-extrabold text-ink">{billing.subscribed ? "Switch plan" : "Choose a plan"}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3 items-stretch">
              {PLAN_CARDS.map((p) => {
                const isCurrent = billing.subscribed && billing.plan === p.id;
                return (
                  <div
                    key={p.id}
                    className="relative flex h-full flex-col rounded-[22px] p-7"
                    style={{
                      background: p.highlight ? "linear-gradient(165deg, #1c1712, var(--navy-900) 55%)" : "var(--navy-900)",
                      border: p.highlight ? "1px solid rgba(240,118,46,0.4)" : "1px solid var(--navy-700)",
                    }}
                  >
                    {p.highlight && (
                      <span className="absolute -top-3 right-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: "var(--accent)" }}>
                        Most popular
                      </span>
                    )}
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-ink-dim">{p.name}</p>
                    <p className="mt-1 text-xs text-ink-faint">{p.tagline}</p>
                    <p className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-ink">{p.price}</span>
                      <span className="text-sm text-ink-faint">/ mo</span>
                    </p>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-ink-dim">
                          <span className={`mt-px ${p.highlight ? "text-accent" : "text-sky"}`}>{tick}</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-emerald-500/12 py-3 text-sm font-bold text-emerald-400">
                        {tick} Current plan
                      </div>
                    ) : !billing.billingConfigured ? (
                      <button
                        onClick={() => {
                          // Preselect the plan in the request form, then take
                          // them to it — otherwise they'd pick the plan twice.
                          setRequestPlan(p.id);
                          document
                            .getElementById("upgrade-request")
                            ?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="mt-6 flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold transition-colors"
                        style={
                          p.highlight
                            ? { background: "linear-gradient(100deg, var(--accent), #f5934f)", color: "#fff" }
                            : { border: "1px solid var(--navy-700)", color: "var(--ink)" }
                        }
                      >
                        Request {p.name}
                      </button>
                    ) : (
                      <button
                        onClick={() => upgrade(p.id)}
                        disabled={working !== null}
                        className="mt-6 w-full rounded-full py-3.5 text-sm font-bold transition-colors disabled:opacity-50"
                        style={
                          p.highlight
                            ? { background: "linear-gradient(100deg, var(--accent), #f5934f)", color: "#fff" }
                            : { border: "1px solid var(--navy-700)", color: "var(--ink)" }
                        }
                      >
                        {working === p.id ? "Starting checkout…" : billing.subscribed ? `Switch to ${p.name}` : `Choose ${p.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-center text-xs text-ink-faint">
              {billing.billingConfigured
                ? "Payments are handled securely by Stripe. Cancel anytime — no contracts. "
                : "Cancel anytime — no contracts. "}
              Your published menu stays live for customers even if your plan lapses.
            </p>

            <SupportPanel token={token} />
          </section>
        )}
      </main>
    </div>
  );
}
