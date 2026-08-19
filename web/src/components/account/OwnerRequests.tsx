"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLANS, PLAN_IDS, priceFor, yearlySavingPercent, type BillingPeriod, type Plan } from "@/lib/plans";
import { Btn, ErrorNote, Field, inputCls } from "@/components/portal/ui";

/* ---------- shared ---------- */

type Requested = {
  id: string;
  requestedPlan: string;
  amount: number;
  currency: string;
  billingPeriod: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<Requested["status"], { label: string; color: string; bg: string }> = {
  PENDING: { label: "Being reviewed", color: "#e8a02a", bg: "rgba(232,160,42,0.12)" },
  APPROVED: { label: "Approved", color: "#8fc47d", bg: "rgba(123,178,106,0.12)" },
  REJECTED: { label: "Not approved", color: "#ef6a58", bg: "rgba(224,82,63,0.12)" },
};

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/* ---------- Upgrade request ---------- */

/**
 * Lets an owner pay by bank transfer and send the slip in, while card payments
 * are not live yet. Replaces the old mailto link: an email cannot be tracked,
 * counted, or turned into revenue reporting.
 */
export function UpgradeRequestPanel({
  token,
  selectedPlan,
  onSelectPlan,
  period,
  onSelectPeriod,
}: {
  token: string;
  selectedPlan: Plan;
  onSelectPlan: (p: Plan) => void;
  /** Owned by AccountClient so the plan cards above show the same prices. */
  period: BillingPeriod;
  onSelectPeriod: (p: BillingPeriod) => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Requested[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // A counter, not a loader called from an effect: refreshing after a submit
  // must not set state synchronously inside the effect body.
  const [historyKey, setHistoryKey] = useState(0);
  const reloadHistory = useCallback(() => setHistoryKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/upgrade-requests", { headers: authHeaders(token) });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setHistory(data.requests ?? []);
      } catch {
        // A missing history is not worth an error banner over the form itself.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, historyKey]);

  const pending = history.find((r) => r.status === "PENDING");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("plan", selectedPlan);
      form.set("billingPeriod", period);
      form.set("amount", amount || String(priceFor(selectedPlan, period)));
      form.set("currency", currency);
      form.set("note", note);
      if (slip) form.set("slip", slip);

      const res = await fetch("/api/upgrade-requests", {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the request.");

      setAmount("");
      setNote("");
      setSlip(null);
      if (fileRef.current) fileRef.current.value = "";
      reloadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="upgrade-request" className="mt-6 rounded-[20px] border border-navy-700 bg-navy-900 p-6">
      <h2 className="text-lg font-extrabold text-ink">Upgrade by bank transfer</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
        Card payments aren&apos;t live yet. Transfer the amount, attach the slip below, and we&apos;ll
        activate your plan once we&apos;ve checked it — usually within a few hours.
      </p>

      {history.length > 0 && (
        <ul className="mt-5 space-y-2">
          {history.slice(0, 3).map((r) => {
            const s = STATUS_STYLE[r.status];
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-700 px-4 py-3 text-sm"
              >
                <span className="text-ink-dim">
                  {PLANS[r.requestedPlan as Plan]?.label ?? r.requestedPlan}
                  {r.billingPeriod === "yearly" ? " (yearly)" : " (monthly)"} · {r.currency}{" "}
                  {r.amount.toFixed(2)} · {new Date(r.createdAt).toLocaleDateString()}
                  {r.reviewNote && (
                    <span className="mt-1 block text-xs text-ink-faint">“{r.reviewNote}”</span>
                  )}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ color: s.color, background: s.bg }}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {pending ? (
        <p className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(232,160,42,0.35)", background: "rgba(232,160,42,0.08)", color: "#e8a02a" }}>
          Your request is with us — we&apos;ll email you as soon as it&apos;s reviewed.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["monthly", "yearly"] as const).map((pd) => (
              <button
                key={pd}
                type="button"
                onClick={() => onSelectPeriod(pd)}
                aria-pressed={period === pd}
                className="rounded-full border px-4 py-2 text-xs font-bold capitalize transition-colors"
                style={
                  period === pd
                    ? { borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(240,118,46,0.08)" }
                    : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }
                }
              >
                {pd}
              </button>
            ))}
            {/* "2 months free" rather than a percentage: it is the same offer
                stated in a way an owner can check against their own bill. */}
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold"
              style={{ background: "rgba(123,178,106,0.14)", color: "#8fc47d" }}
            >
              Yearly = 2 months free ({yearlySavingPercent()}% off)
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Plan">
              <select
                value={selectedPlan}
                onChange={(e) => onSelectPlan(e.target.value as Plan)}
                className={`${inputCls} cursor-pointer`}
              >
                {PLAN_IDS.map((p) => (
                  <option key={p} value={p}>
                    {PLANS[p].label} — ${priceFor(p, period)}
                    {period === "yearly" ? "/yr" : "/mo"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount paid">
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(priceFor(selectedPlan, period))}
                className={inputCls}
              />
            </Field>
            <Field label="Currency">
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={8}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Payment slip" hint="Photo or PDF of the transfer receipt. Max 10 MB.">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-ink-dim file:mr-3 file:rounded-full file:border-0 file:bg-navy-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-ink"
            />
          </Field>

          <Field label="Anything we should know? (optional)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reference number, which bank, who paid…"
              className={inputCls}
            />
          </Field>

          <ErrorNote message={error} />
          <Btn type="submit" loading={busy} className="w-full sm:w-auto">
            Send upgrade request
          </Btn>
          <p className="text-xs leading-relaxed text-ink-faint">
            Your slip is stored privately and is only visible to GoPlate staff reviewing the payment.
          </p>
        </form>
      )}
    </section>
  );
}

/* ---------- Problem report ---------- */

type Thread = {
  id: string;
  subject: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  reply: string;
  repliedAt: string | null;
  createdAt: string;
};

/** "Something is wrong" — lands in the back office, answered by email. */
export function SupportPanel({ token }: { token: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);

  const [threadsKey, setThreadsKey] = useState(0);
  const reloadThreads = useCallback(() => setThreadsKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/support", { headers: authHeaders(token) });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setThreads(data.messages ?? []);
      } catch {
        /* non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, threadsKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the message.");
      setSubject("");
      setBody("");
      setSent(true);
      reloadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-[20px] border border-navy-700 bg-navy-900 p-6">
      <h2 className="text-lg font-extrabold text-ink">Report a problem</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
        Something not working, or a question about your plan? Tell us here and we&apos;ll reply by
        email.
      </p>

      {threads.length > 0 && (
        <ul className="mt-5 space-y-2">
          {threads.slice(0, 3).map((t) => (
            <li key={t.id} className="rounded-xl border border-navy-700 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">{t.subject}</span>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: t.status === "OPEN" ? "#e8a02a" : "#8fc47d" }}
                >
                  {t.status === "OPEN" ? "waiting" : "answered"}
                </span>
              </div>
              {t.reply && (
                <p className="mt-2 whitespace-pre-wrap text-ink-dim">{t.reply}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {sent && (
        <p className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(123,178,106,0.35)", background: "rgba(123,178,106,0.08)", color: "#8fc47d" }}>
          Thanks — we&apos;ve got it and will reply by email.
        </p>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Subject">
          <input
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setSent(false); }}
            required
            minLength={3}
            maxLength={150}
            placeholder="My 3D model didn't finish"
            className={inputCls}
          />
        </Field>
        <Field label="What happened?">
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setSent(false); }}
            required
            minLength={10}
            rows={4}
            placeholder="Describe the problem — which dish, what you tried, what you saw."
            className={inputCls}
          />
        </Field>
        <ErrorNote message={error} />
        <Btn type="submit" loading={busy} className="w-full sm:w-auto">
          Send message
        </Btn>
      </form>
    </section>
  );
}
