"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminMessage } from "@/lib/admin-api";
import { Btn, ErrorNote, inputCls } from "@/components/portal/ui";

const FILTERS = ["OPEN", "RESOLVED", "ALL"] as const;

export function SupportTab({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("OPEN");
  const [rows, setRows] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // See RequestsTab: a counter re-runs the fetch without setting state from
  // inside the effect body.
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.messages(status);
        if (cancelled) return;
        setRows(data.messages);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load messages.");
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
          Nothing here. {status === "OPEN" && "Every report has been answered."}
        </p>
      )}

      <div className="space-y-3">
        {rows.map((m) => (
          <MessageCard
            key={m.id}
            message={m}
            onChanged={() => {
              reload();
              onChanged();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageCard({ message: m, onChanged }: { message: AdminMessage; onChanged: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (opts: { reply?: string; status?: "OPEN" | "RESOLVED" }) => {
    setBusy(true);
    setError("");
    try {
      await adminApi.answer(m.id, opts);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{m.subject}</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {m.user.name} · {m.user.email} ·{" "}
            <span style={{ color: m.user.paying ? "#8fc47d" : undefined }}>
              {m.user.paying ? `paying (${m.user.plan})` : "not paying"}
            </span>{" "}
            · {new Date(m.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-bold uppercase tracking-wider"
          style={{ color: m.status === "OPEN" ? "var(--accent)" : "#8fc47d" }}
        >
          {m.status.toLowerCase()}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-xl border border-navy-700 bg-navy-800 p-3 text-sm leading-relaxed text-ink-dim">
        {m.body}
      </p>

      {m.reply && (
        <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "rgba(123,178,106,0.3)", background: "rgba(123,178,106,0.07)" }}>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Replied {m.repliedAt && new Date(m.repliedAt).toLocaleString()}
            {m.handledBy && ` by ${m.handledBy}`}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">{m.reply}</p>
        </div>
      )}

      {m.status === "OPEN" && (
        <div className="mt-4 space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Write a reply — it's emailed to the owner"
            className={inputCls}
          />
          <ErrorNote message={error} />
          <div className="flex flex-wrap gap-3">
            <Btn
              onClick={() => send({ reply, status: "RESOLVED" })}
              loading={busy}
              disabled={busy || reply.trim().length === 0}
            >
              Reply and resolve
            </Btn>
            <Btn variant="secondary" onClick={() => send({ status: "RESOLVED" })} disabled={busy}>
              Resolve without replying
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
