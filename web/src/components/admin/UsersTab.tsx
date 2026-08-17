"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminUser } from "@/lib/admin-api";
import { PLAN_IDS } from "@/lib/plans";
import { Btn, ErrorNote, inputCls } from "@/components/portal/ui";

/** Search, then change a plan. The console's day-to-day screen. */
export function UsersTab({ onChanged }: { onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.users(search);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounced so typing an email doesn't fire a query per keystroke.
    const t = setTimeout(() => void load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  const change = async (
    user: AdminUser,
    body: { plan?: string; active?: boolean; trialDays?: number }
  ) => {
    setSavingId(user.id);
    setError("");
    try {
      const { user: updated } = await adminApi.updateUser(user.id, body);
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className={`${inputCls} max-w-sm`}
        />
        <span className="text-sm text-ink-faint">
          {loading ? "Loading…" : `${total} account${total === 1 ? "" : "s"}`}
        </span>
      </div>

      <ErrorNote message={error} />

      <div className="overflow-x-auto rounded-2xl border border-navy-700">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-navy-700 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Restaurants</th>
              <th className="px-4 py-3">Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-navy-700/60 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-ink-dim">{u.email}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {u.signIn} · joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {u.subscribed ? (
                    <span className="font-semibold" style={{ color: "#8fc47d" }}>Paying</span>
                  ) : u.accessActive ? (
                    <span className="text-ink-dim">Trial · {u.trialDaysLeft}d left</span>
                  ) : (
                    <span style={{ color: "#ef6a58" }}>Lapsed</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.plan}
                    disabled={savingId === u.id}
                    onChange={(e) => change(u, { plan: e.target.value })}
                    className={`${inputCls} w-32 cursor-pointer py-2`}
                  >
                    {PLAN_IDS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-ink-dim">{u.restaurants}</td>
                <td className="px-4 py-3">
                  <Btn
                    small
                    variant={u.subscribed ? "secondary" : "primary"}
                    disabled={savingId === u.id}
                    onClick={() => change(u, { active: !u.subscribed })}
                  >
                    {u.subscribed ? "Deactivate" : "Activate"}
                  </Btn>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-faint">
                  No accounts match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-ink-faint">
        Activating marks the account as paying with no expiry — the same manual activation used
        before the payment gateway. Deactivating drops them back to their trial, if any is left.
        Changing a plan alone does not grant access.
      </p>
    </div>
  );
}
