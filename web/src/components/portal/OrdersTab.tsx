"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Order } from "@/lib/portal";
import { Btn, Confirm, Spinner } from "@/components/portal/ui";

const STATUS: Record<Order["status"], { label: string; cls: string }> = {
  NEW: { label: "NEW", cls: "bg-accent/15 text-accent" },
  PREPARING: { label: "PREPARING", cls: "bg-sky-500/15 text-sky-400" },
  DONE: { label: "DONE", cls: "bg-emerald-500/15 text-emerald-400" },
  CANCELLED: { label: "CANCELLED", cls: "bg-navy-800 text-ink-faint" },
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/** Kitchen order feed — polls every 15s like the app's Orders screen. */
export function OrdersTab({
  restaurantId,
  currencyFmt,
}: {
  restaurantId: string;
  currencyFmt: (n: number) => string;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (background = true) => {
    try {
      const { orders } = await api.listOrders(restaurantId, background);
      setOrders(orders);
    } catch {
      // polling retries; don't spam errors
      setOrders((prev) => prev ?? []);
    }
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens after await
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const setStatus = async (order: Order, status: Order["status"]) => {
    setBusy(true);
    try {
      await api.updateOrder(order.id, status);
      await load();
    } finally {
      setBusy(false);
      setCancelling(null);
    }
  };

  if (orders === null) return <Spinner />;

  return (
    <section className="mt-6">
      <p className="text-xs text-ink-faint">Refreshes automatically every 15 seconds.</p>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-navy-700 p-12 text-center">
          <p className="text-lg font-bold text-ink">No orders yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-dim">
            When customers order from your menu, they appear here the moment they&apos;re placed. Ordering is
            available on the Pro plan.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
              <div className="flex items-center gap-3">
                <p className="text-lg font-extrabold text-ink">#{o.code}</p>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS[o.status].cls}`}>
                  {STATUS[o.status].label}
                </span>
                <span className="ml-auto text-xs text-ink-faint">{timeAgo(o.createdAt)}</span>
              </div>
              {(o.tableNumber || o.customerName) && (
                <p className="mt-1.5 text-sm font-semibold text-ink-dim">
                  {o.tableNumber ? `Table ${o.tableNumber}` : ""}
                  {o.tableNumber && o.customerName ? " · " : ""}
                  {o.customerName}
                </p>
              )}
              <div className="mt-3 space-y-1.5">
                {o.items.map((l, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="w-8 shrink-0 font-extrabold text-accent">{l.quantity}×</span>
                    <span className="min-w-0">
                      <span className="text-ink">{l.name}</span>
                      {l.options.length > 0 && (
                        <span className="block text-xs text-ink-faint">{l.options.join(" · ")}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {o.note && <p className="mt-3 text-sm italic text-sky-400">“{o.note}”</p>}
              <div className="mt-4 flex items-center justify-between border-t border-navy-800 pt-3">
                <p className="text-lg font-extrabold text-accent">{currencyFmt(o.total)}</p>
                {(o.status === "NEW" || o.status === "PREPARING") && (
                  <div className="flex gap-2">
                    <Btn small variant="ghost" onClick={() => setCancelling(o)}>Cancel</Btn>
                    <Btn small onClick={() => setStatus(o, o.status === "NEW" ? "PREPARING" : "DONE")} loading={busy}>
                      {o.status === "NEW" ? "Start preparing" : "Mark done"}
                    </Btn>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelling && (
        <Confirm
          title={`Cancel order #${cancelling.code}?`}
          body="The order will be marked cancelled — do this if the customer changed their mind or it was placed by mistake."
          confirmLabel="Cancel order"
          danger
          busy={busy}
          onConfirm={() => setStatus(cancelling, "CANCELLED")}
          onCancel={() => setCancelling(null)}
        />
      )}
    </section>
  );
}
