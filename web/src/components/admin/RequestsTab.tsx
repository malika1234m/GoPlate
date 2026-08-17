"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, fetchSlipUrl, type AdminRequest } from "@/lib/admin-api";
import { Btn, ErrorNote, inputCls } from "@/components/portal/ui";

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

export function RequestsTab({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("PENDING");
  const [rows, setRows] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // Bumped to re-run the fetch after a decision, instead of calling a loader
  // that would have to set state synchronously from inside the effect.
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.requests(status);
        if (cancelled) return;
        setRows(data.requests);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setLoading(true);
              setStatus(f);
            }}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              status === f
                ? "border-accent text-accent"
                : "border-navy-700 text-ink-faint hover:text-ink-dim"
            }`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      {loading && <p className="text-sm text-ink-dim">Loading…</p>}

      {!loading && rows.length === 0 && (
        <p className="rounded-2xl border border-navy-700 bg-navy-900 px-5 py-8 text-center text-sm text-ink-faint">
          Nothing here. {status === "PENDING" && "Every request has been reviewed."}
        </p>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            open={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
            onReviewed={() => {
              reload();
              onChanged();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RequestCard({
  request: r,
  open,
  onToggle,
  onReviewed,
}: {
  request: AdminRequest;
  open: boolean;
  onToggle: () => void;
  onReviewed: () => void;
}) {
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipError, setSlipError] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  // Fetched only while the card is open, and revoked when it closes: a blob URL
  // left alive keeps someone's bank slip in memory for the rest of the session.
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !r.hasSlip) return;
    let cancelled = false;

    fetchSlipUrl(r.id)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        urlRef.current = url;
        setSlipUrl(url);
      })
      .catch(() => {
        if (!cancelled) setSlipError("Could not load the slip.");
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setSlipUrl(null);
    };
  }, [open, r.id, r.hasSlip]);

  const review = async (decision: "APPROVED" | "REJECTED") => {
    setBusy(decision);
    setError("");
    try {
      await adminApi.review(r.id, decision, reviewNote.trim());
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision.");
      setBusy(null);
    }
  };

  const expected = r.planPriceUsd;
  // A mismatch is not an error — currencies differ, and owners pay for several
  // months at once — but it is the first thing worth noticing.
  const amountLooksOff = r.currency === "USD" && expected > 0 && r.amount < expected;

  const statusColor =
    r.status === "APPROVED" ? "#8fc47d" : r.status === "REJECTED" ? "#ef6a58" : "var(--accent)";

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {r.user.name} <span className="font-normal text-ink-dim">· {r.user.email}</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            wants <span className="font-semibold text-ink-dim">{r.planLabel}</span> · paid{" "}
            {r.currency} {r.amount.toFixed(2)} · {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider" style={{ color: statusColor }}>
          {r.status.toLowerCase()}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-navy-700 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <p className="text-ink-dim">
                Currently on <span className="font-semibold text-ink">{r.user.currentPlan}</span>
                {r.user.currentlyPaying ? " (paying)" : " (not paying)"}
              </p>
              <p className="text-ink-dim">
                Plan price: <span className="text-ink">${expected}/mo</span>
              </p>
              {amountLooksOff && (
                <p className="font-semibold" style={{ color: "#e8a02a" }}>
                  Paid less than one month of {r.planLabel} — check before approving.
                </p>
              )}
              {r.note && (
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-navy-700 bg-navy-800 p-3 text-ink-dim">
                  {r.note}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                Payment slip
              </p>
              {!r.hasSlip && <p className="text-sm text-ink-faint">No slip attached.</p>}
              {slipError && <p className="text-sm" style={{ color: "#ef6a58" }}>{slipError}</p>}
              {slipUrl && (
                <a href={slipUrl} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slipUrl}
                    alt="Payment slip"
                    className="max-h-72 w-full rounded-xl border border-navy-700 object-contain"
                  />
                  <span className="mt-1.5 block text-xs font-semibold text-accent">
                    Open full size
                  </span>
                </a>
              )}
              {r.hasSlip && !slipUrl && !slipError && (
                <p className="text-sm text-ink-faint">Loading slip…</p>
              )}
            </div>
          </div>

          {r.status === "PENDING" ? (
            <div className="space-y-3">
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={2}
                placeholder="Optional note — sent to the owner in the decision email"
                className={inputCls}
              />
              <ErrorNote message={error} />
              <div className="flex flex-wrap gap-3">
                <Btn onClick={() => review("APPROVED")} loading={busy === "APPROVED"} disabled={!!busy}>
                  Approve and set {r.planLabel}
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => review("REJECTED")}
                  loading={busy === "REJECTED"}
                  disabled={!!busy}
                >
                  Reject
                </Btn>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-dim">
              {r.status.toLowerCase()} by {r.reviewedBy ?? "staff"}{" "}
              {r.reviewedAt && `on ${new Date(r.reviewedAt).toLocaleString()}`}
              {r.reviewNote && ` — “${r.reviewNote}”`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
