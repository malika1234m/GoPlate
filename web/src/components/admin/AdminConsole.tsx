"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { adminApi, getAdminToken, setAdminToken, type Overview } from "@/lib/admin-api";
import { UsersTab } from "@/components/admin/UsersTab";
import { RequestsTab } from "@/components/admin/RequestsTab";
import { SupportTab } from "@/components/admin/SupportTab";

type Tab = "overview" | "users" | "requests" | "support";

export function AdminConsole() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ready, setReady] = useState(false);
  const [overviewKey, setOverviewKey] = useState(0);

  /**
   * The queue counts drive the tab badges, so any tab can ask for them to be
   * refetched after it changes something — approving a request should empty the
   * badge straight away. A counter rather than a loader function, so the fetch
   * stays inside an effect instead of setting state from one.
   */
  const loadOverview = useCallback(() => setOverviewKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAdminToken()) {
        router.replace("/admin/login");
        return;
      }
      try {
        const data = await adminApi.overview();
        if (!cancelled) {
          setOverview(data);
          setReady(true);
        }
      } catch {
        // A dead session already redirects inside the api client.
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, overviewKey]);

  const signOut = () => {
    setAdminToken(null);
    router.replace("/admin/login");
  };

  if (!ready) return null;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "requests", label: "Upgrade requests", badge: overview?.queues.pendingRequests },
    { id: "support", label: "Problem reports", badge: overview?.queues.openMessages },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-poppins)" }}>
      <header className="border-b border-navy-700">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-extrabold tracking-wide text-ink">
              <span className="text-accent">Go</span>Plate
            </span>
            <span className="ml-1 rounded-full border border-navy-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
              Back office
            </span>
          </div>
          <button onClick={signOut} className="text-sm font-semibold text-ink-dim hover:text-accent">
            Sign out
          </button>
        </div>
      </header>

      <nav className="border-b border-navy-700">
        <div className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-5 sm:px-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-bold transition-colors ${
                tab === t.id
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-faint hover:text-ink-dim"
              }`}
            >
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
        {tab === "overview" && <OverviewTab data={overview} />}
        {tab === "users" && <UsersTab onChanged={loadOverview} />}
        {tab === "requests" && <RequestsTab onChanged={loadOverview} />}
        {tab === "support" && <SupportTab onChanged={loadOverview} />}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">{label}</p>
      <p
        className="mt-2 text-3xl font-extrabold"
        style={{ color: accent ? "var(--accent)" : "var(--ink)" }}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">{hint}</p>}
    </div>
  );
}

function OverviewTab({ data }: { data: Overview | null }) {
  if (!data) return <p className="text-sm text-ink-dim">Loading…</p>;

  const { users, revenue, byPlan, queues } = data;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-faint">Revenue</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Collected"
            value={money(revenue.collectedTotal)}
            hint={`${revenue.approvedPayments} approved payment${revenue.approvedPayments === 1 ? "" : "s"}`}
            accent
          />
          <Stat label="Last 30 days" value={money(revenue.collectedLast30Days)} />
          <Stat
            label="Projected MRR"
            value={money(revenue.mrrProjected)}
            hint="What today's paying accounts are worth per month"
          />
          <Stat
            label="Paying accounts"
            value={String(users.paying)}
            hint={`${byPlan.basic} basic · ${byPlan.starter} starter · ${byPlan.pro} pro`}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Collected counts approved payment slips only — money you have actually received. Projected
          MRR is an estimate from current plans and assumes nobody churns.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-faint">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total" value={String(users.total)} hint={`${users.newLast30Days} joined in 30 days`} />
          <Stat label="Paying" value={String(users.paying)} />
          <Stat label="On free trial" value={String(users.onTrial)} />
          <Stat
            label="Lapsed"
            value={String(users.lapsed)}
            hint="Trial over, not subscribed — menus still live, editing locked"
          />
        </div>
      </section>

      {(queues.pendingRequests > 0 || queues.openMessages > 0) && (
        <section className="rounded-2xl border p-5" style={{ borderColor: "rgba(240,118,46,0.35)", background: "rgba(240,118,46,0.06)" }}>
          <h2 className="text-sm font-bold text-ink">Waiting for you</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-dim">
            {queues.pendingRequests > 0 && (
              <li>
                <span className="font-bold text-accent">{queues.pendingRequests}</span> upgrade
                request{queues.pendingRequests === 1 ? "" : "s"} to review
              </li>
            )}
            {queues.openMessages > 0 && (
              <li>
                <span className="font-bold text-accent">{queues.openMessages}</span> unanswered
                problem report{queues.openMessages === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
