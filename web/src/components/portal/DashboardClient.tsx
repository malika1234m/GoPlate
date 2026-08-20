"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getToken, Billing, Restaurant, User } from "@/lib/portal";
import { Btn, ErrorNote, Field, inputCls, Modal, PortalHeader, Spinner } from "@/components/portal/ui";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const TIPS: { icon: React.ReactNode; title: string; body: string; tone: string }[] = [
  {
    tone: "rgba(63,169,224,0.14)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3fa9e0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="13" height="12" rx="2.5" />
        <path d="m16 10.5 5-3v9l-5-3" />
      </svg>
    ),
    title: "Film a dish in 360°",
    body: "Walk slowly around the plate — that's it. We turn it into the menu star.",
  },
  {
    tone: "rgba(240,118,46,0.14)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0762e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
        <path d="M4 7.5 12 12l8-4.5M12 12v9" />
      </svg>
    ),
    title: "Put dishes in 3D",
    body: "Customers spin them right on the menu — and place them on the table in AR.",
  },
  {
    tone: "rgba(123,178,106,0.14)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7bb26a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
        <path d="M13.5 13.5h3v3h-3zM17.5 17.5h2.5V20h-2.5z" />
      </svg>
    ),
    title: "Print your table card",
    body: "One QR on every table. Customers scan with their camera — no app needed.",
  },
];

const cutleryMark = (
  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v4M9 3v4M16 3c-1.5 1.5-2 3.5-2 6 0 2 .8 3 2 3v9M16 3v18" />
  </svg>
);

export function DashboardClient() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, b, m] = await Promise.all([
        api.restaurants(),
        api.billing().catch(() => null),
        api.me().catch(() => null),
      ]);
      setRestaurants(r.restaurants);
      setBilling(b);
      setMe(m?.user ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your restaurants.");
      setRestaurants([]);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens after await
    load();
  }, [router, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { restaurant } = await api.createRestaurant({ name: newName.trim() });
      router.push(`/dashboard/${restaurant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the restaurant.");
      setBusy(false);
    }
  };

  const firstName = me?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-1/3 h-[420px] w-[680px] rounded-full blur-[130px]" style={{ background: "rgba(240,118,46,0.10)" }} />
        <div className="absolute bottom-0 -right-40 h-[340px] w-[460px] rounded-full blur-[120px]" style={{ background: "rgba(63,169,224,0.07)" }} />
      </div>

      <PortalHeader active="dashboard" />
      <main className="relative z-10 mx-auto max-w-[1200px] px-6 py-10">
        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-dim">{greeting()},</p>
            <h1 className="mt-0.5 text-4xl font-extrabold text-ink">
              {firstName ? `${firstName} ` : "Welcome "}
              <span aria-hidden>👋</span>
            </h1>
          </div>
          <Btn onClick={() => setCreating(true)}>+ New restaurant</Btn>
        </div>

        {/* Plan & usage strip */}
        {billing && (
          <div className="mt-8 grid gap-4 rounded-[24px] border border-navy-700 bg-navy-900/80 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="sm:pr-8 sm:border-r sm:border-navy-800">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">Your plan</p>
              <p className="mt-1.5 text-2xl font-extrabold text-ink">
                {billing.label}
                {billing.subscribed ? (
                  <span className="ml-2.5 align-middle rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">Active</span>
                ) : billing.accessActive ? (
                  <span className="ml-2.5 align-middle rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-400">
                    Trial · {billing.trialDaysLeft}d left
                  </span>
                ) : (
                  <span className="ml-2.5 align-middle rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-400">Trial ended</span>
                )}
              </p>
              <Link href="/account" className="mt-1 inline-block text-sm font-semibold text-accent hover:underline">
                Manage plan →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
              {(
                [
                  ["Restaurants", billing.usage.restaurants, billing.limits.maxRestaurants],
                  ["3D models", billing.usage.models, billing.limits.maxModels],
                  ["Videos", billing.usage.videos, billing.limits.maxVideos],
                  // The two meters below are the monthly allowance, which is a
                  // different thing from the counts on the left: those are what
                  // the menu holds, these are what was built since the 1st.
                  // Shown so hitting the ceiling is never a surprise.
                  ["Built this month", billing.usage.modelsThisMonth, billing.limits.modelsPerMonth],
                  ["Videos this month", billing.usage.videosThisMonth, billing.limits.videosPerMonth],
                ] as const
              ).map(([label, used, max]) => {
                const unlimited = max === -1;
                const pct = unlimited ? 0 : Math.min(100, (used / Math.max(max, 1)) * 100);
                return (
                  <div key={label}>
                    <p className="text-xs text-ink-faint">{label}</p>
                    <p className="mt-0.5 text-lg font-extrabold text-ink">
                      {used}
                      <span className="text-xs font-medium text-ink-faint"> / {unlimited ? "∞" : max}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: unlimited ? "100%" : `${pct}%`,
                          background: unlimited
                            ? "linear-gradient(90deg, rgba(240,118,46,0.5), rgba(63,169,224,0.5))"
                            : pct >= 100
                              ? "#ef6a58"
                              : "linear-gradient(90deg, var(--accent), #f5934f)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {billing && !billing.subscribed && !billing.accessActive && (
          <p className="mt-4 rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-sm text-ink-dim">
            Your free month has ended — editing is paused, but your published menus stay live for customers.{" "}
            <Link href="/account" className="font-semibold text-accent">Choose a plan</Link> to keep going.
          </p>
        )}

        <div className="mt-4"><ErrorNote message={error} /></div>

        {/* Restaurants */}
        {restaurants === null ? (
          <Spinner />
        ) : restaurants.length === 0 ? (
          <div className="mt-14 rounded-[24px] border border-dashed border-navy-700 p-14 text-center">
            <p className="text-lg font-bold text-ink">No restaurants yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-dim">
              Create your first restaurant and your menu can be live — with a printable QR — in minutes.
            </p>
            <div className="mt-6">
              <Btn onClick={() => setCreating(true)}>Create your restaurant</Btn>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mt-10 text-xl font-extrabold text-ink">Your restaurants</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {restaurants.map((r) => (
                <div
                  key={r.id}
                  className="group relative overflow-hidden rounded-[22px] border border-navy-700 transition-colors hover:border-accent/60"
                  style={{ background: "linear-gradient(150deg, rgba(240,118,46,0.10), var(--navy-900) 45%)" }}
                >
                  {/* watermark */}
                  <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 rotate-12 text-accent/15 transition-transform duration-300 group-hover:rotate-6">
                    {cutleryMark}
                  </span>

                  <div className="relative p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-accent"
                          style={{ background: "rgba(240,118,46,0.14)", border: "1px solid rgba(240,118,46,0.3)" }}
                        >
                          {r.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-extrabold text-ink">{r.name}</p>
                          <p className="truncate text-xs text-ink-faint">/r/{r.slug}</p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                          r.isPublished ? "bg-emerald-500/15 text-emerald-400" : "bg-navy-800 text-ink-faint"
                        }`}
                      >
                        {r.isPublished ? "● LIVE" : "DRAFT"}
                      </span>
                    </div>

                    {r.description ? (
                      <p className="mt-4 line-clamp-1 text-sm text-ink-dim">{r.description}</p>
                    ) : (
                      <p className="mt-4 text-sm italic text-ink-faint">Add a description in Settings</p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/${r.id}`}
                        className="rounded-full px-4 py-2 text-xs font-bold text-white"
                        style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
                      >
                        Manage menu
                      </Link>
                      <Link
                        href={`/dashboard/${r.id}?tab=orders`}
                        className="rounded-full border border-navy-700 px-4 py-2 text-xs font-bold text-ink-dim hover:text-ink"
                      >
                        Orders
                      </Link>
                      <Link
                        href={`/dashboard/${r.id}?tab=qr`}
                        className="rounded-full border border-navy-700 px-4 py-2 text-xs font-bold text-ink-dim hover:text-ink"
                      >
                        QR card
                      </Link>
                      {r.isPublished && (
                        <a
                          href={`/r/${r.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-navy-700 px-4 py-2 text-xs font-bold text-ink-dim hover:text-ink"
                        >
                          View live ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tips */}
        <h2 className="mt-12 text-xl font-extrabold text-ink">Make your menu irresistible</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {TIPS.map((t) => (
            <div key={t.title} className="rounded-[20px] border border-navy-800 bg-navy-900 p-6 transition-colors hover:border-navy-700">
              <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: t.tone }}>
                {t.icon}
              </span>
              <p className="mt-4 text-[15px] font-bold text-ink">{t.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">{t.body}</p>
            </div>
          ))}
        </div>
      </main>

      {creating && (
        <Modal title="New restaurant" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="space-y-4">
            <Field label="Restaurant name" hint="You can add the details, theme, and address afterwards.">
              <input autoFocus required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="The Copper Kettle" className={inputCls} />
            </Field>
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setCreating(false)}>Cancel</Btn>
              <Btn type="submit" loading={busy}>Create</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
