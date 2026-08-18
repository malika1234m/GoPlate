"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getToken, Category, MenuItem, Restaurant } from "@/lib/portal";
import { Btn, Confirm, ErrorNote, Field, inputCls, Modal, PortalHeader, Spinner } from "@/components/portal/ui";
import { DishDrawer } from "@/components/portal/DishDrawer";
import { OrdersTab } from "@/components/portal/OrdersTab";
import { SettingsTab } from "@/components/portal/SettingsTab";
import { QrTab } from "@/components/portal/QrTab";

type Tab = "menu" | "orders" | "qr" | "settings";

function mediaBadge(i: MenuItem): { label: string; cls: string } {
  if (i.modelStatus === "READY") return { label: "3D READY", cls: "bg-emerald-500/15 text-emerald-400" };
  if (i.modelStatus === "PROCESSING") return { label: "3D PROCESSING", cls: "bg-sky-500/15 text-sky-400" };
  if (i.videoUrl || i.storyVideoUrl) return { label: "VIDEO", cls: "bg-sky-500/15 text-sky-400" };
  if (i.imageUrl) return { label: "PHOTO", cls: "bg-navy-800 text-ink-dim" };
  return { label: "NO MEDIA", cls: "bg-red-500/10 text-red-400" };
}

export function RestaurantClient({ id }: { id: string }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  // Deep links from the dashboard (?tab=orders / ?tab=qr). Read once on mount;
  // safe from hydration mismatch because tabs render only after the client fetch.
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "menu";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "orders" || t === "qr" || t === "settings" ? t : "menu";
  });
  const [error, setError] = useState("");

  // Menu-tab state
  const [catModal, setCatModal] = useState<null | { cat?: Category }>(null);
  const [catName, setCatName] = useState("");
  const [catAllDay, setCatAllDay] = useState(true);
  const [catFrom, setCatFrom] = useState("");
  // "" = a top-level section; otherwise the section this sits inside.
  const [catParent, setCatParent] = useState("");
  const [catTo, setCatTo] = useState("");
  const [catErr, setCatErr] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [drawer, setDrawer] = useState<null | { categoryId: string; item?: MenuItem }>(null);

  const load = useCallback(async () => {
    try {
      const { restaurant } = await api.restaurant(id);
      setRestaurant(restaurant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the restaurant.");
    }
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens after await
    load();
  }, [router, load]);

  const openCatModal = (cat?: Category, parentId?: string) => {
    setCatName(cat?.name ?? "");
    setCatParent(cat?.parentId ?? parentId ?? "");
    const limited = !!(cat?.availableFrom && cat?.availableTo);
    setCatAllDay(!limited);
    setCatFrom(cat?.availableFrom ?? "");
    setCatTo(cat?.availableTo ?? "");
    setCatErr("");
    setCatModal({ cat });
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatErr("");
    if (!catAllDay && (!catFrom || !catTo)) {
      setCatErr("Pick both a start and an end time — or switch back to All day.");
      return;
    }
    setCatBusy(true);
    setError("");
    try {
      const body = {
        name: catName.trim(),
        availableFrom: catAllDay ? "" : catFrom,
        availableTo: catAllDay ? "" : catTo,
        parentId: catParent || null,
      };
      if (catModal?.cat) await api.updateCategory(catModal.cat.id, body);
      else await api.createCategory(id, body);
      setCatModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the category.");
    } finally {
      setCatBusy(false);
    }
  };

  const removeCategory = async () => {
    if (!deleteCat) return;
    setCatBusy(true);
    try {
      await api.deleteCategory(deleteCat.id);
      setDeleteCat(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the category.");
    } finally {
      setCatBusy(false);
    }
  };

  const currency = restaurant?.currency || "USD";
  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
    } catch {
      return n.toFixed(2);
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "menu", label: "Menu" },
    { id: "orders", label: "Orders" },
    { id: "qr", label: "QR code" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-poppins)" }}>
      <PortalHeader active="dashboard" />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {!restaurant ? (
          <>
            <ErrorNote message={error} />
            <Spinner />
          </>
        ) : (
          <>
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-ink-faint">
                  <Link href="/dashboard" className="hover:text-ink-dim">← All restaurants</Link>
                </p>
                <h1 className="mt-1 truncate text-3xl font-extrabold text-ink">{restaurant.name}</h1>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    restaurant.isPublished ? "bg-emerald-500/15 text-emerald-400" : "bg-navy-800 text-ink-faint"
                  }`}
                >
                  {restaurant.isPublished ? "● LIVE" : "DRAFT"}
                </span>
                <a
                  href={`/r/${restaurant.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-navy-700 px-4 py-2 text-sm font-semibold text-ink-dim hover:text-ink"
                >
                  Preview menu ↗
                </a>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-2 overflow-x-auto border-b border-navy-800 pb-px">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-t-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                    tab === t.id ? "border-b-2 border-accent text-accent" : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4"><ErrorNote message={error} /></div>

            {/* ============ MENU TAB ============ */}
            {tab === "menu" && (
              <section className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-dim">
                    {(restaurant.categories ?? []).reduce((s, c) => s + c.items.length, 0)} dishes ·{" "}
                    {(restaurant.categories ?? []).length} categories
                  </p>
                  <Btn small onClick={() => openCatModal()}>+ New category</Btn>
                </div>

                {(restaurant.categories ?? []).length === 0 && (
                  <div className="mt-10 rounded-[24px] border border-dashed border-navy-700 p-12 text-center">
                    <p className="text-lg font-bold text-ink">Start with a category</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-ink-dim">
                      Categories are your menu&apos;s sections — Starters, Mains, Desserts, Drinks.
                    </p>
                    <div className="mt-5"><Btn onClick={() => openCatModal()}>Add your first category</Btn></div>
                  </div>
                )}

                {(restaurant.categories ?? [])
                  // Sections first, each immediately followed by its own
                  // sub-sections, so the list reads the way the menu does.
                  .flatMap((c) =>
                    c.parentId
                      ? []
                      : [c, ...(restaurant.categories ?? []).filter((s2) => s2.parentId === c.id)]
                  )
                  .map((cat) => (
                  <div key={cat.id} className={cat.parentId ? "mt-6 pl-5 border-l border-navy-700" : "mt-8"}>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className={cat.parentId ? "text-base font-bold text-ink" : "text-xl font-extrabold text-ink"}>
                        {cat.name}
                      </h2>
                      {cat.availableFrom && cat.availableTo && (
                        <span className="rounded-full border border-sky-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
                          {cat.availableFrom}–{cat.availableTo}
                        </span>
                      )}
                      <span className="text-xs text-ink-faint">{cat.items.length} {cat.items.length === 1 ? "dish" : "dishes"}</span>
                      <span className="ml-auto flex gap-2">
                        <button onClick={() => openCatModal(cat)} className="rounded-full border border-navy-700 px-3 py-1 text-xs font-semibold text-ink-dim hover:text-ink">
                          Edit
                        </button>
                        {!cat.parentId && (
                          <button onClick={() => openCatModal(undefined, cat.id)} className="rounded-full border border-navy-700 px-3 py-1 text-xs font-semibold text-ink-dim hover:text-accent">
                            + Sub-section
                          </button>
                        )}
                        <button onClick={() => setDeleteCat(cat)} className="rounded-full border border-navy-700 px-3 py-1 text-xs font-semibold text-ink-dim hover:text-red-400">
                          Delete
                        </button>
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {cat.items.map((item) => {
                        const badge = mediaBadge(item);
                        return (
                          <button
                            key={item.id}
                            onClick={() => setDrawer({ categoryId: cat.id, item })}
                            className="flex items-center gap-4 rounded-2xl border border-navy-700 bg-navy-900 p-3.5 text-left transition-colors hover:border-accent/60"
                          >
                            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-navy-800">
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : item.videoUrl || item.storyVideoUrl ? (
                                <video src={item.videoUrl || item.storyVideoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-ink-faint">
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                    <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v4M9 3v4M16 3c-1.5 1.5-2 3.5-2 6 0 2 .8 3 2 3v9M16 3v18" />
                                  </svg>
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[15px] font-bold text-ink">{item.name}</span>
                                <span className="shrink-0 font-extrabold text-accent">{fmt(item.price)}</span>
                              </span>
                              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                                {!item.isAvailable && (
                                  <span className="rounded-md bg-navy-800 px-2 py-0.5 text-[10px] font-bold text-ink-faint">HIDDEN</span>
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setDrawer({ categoryId: cat.id })}
                        className="flex min-h-[92px] items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-700 text-sm font-bold text-accent transition-colors hover:border-accent"
                      >
                        + Add dish to {cat.name}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {tab === "orders" && <OrdersTab restaurantId={id} currencyFmt={fmt} />}
            {tab === "qr" && <QrTab restaurant={restaurant} />}
            {tab === "settings" && <SettingsTab restaurant={restaurant} onSaved={load} />}
          </>
        )}
      </main>

      {/* Category create/edit */}
      {catModal && (
        <Modal
          title={(() => {
            const parent = catParent
              ? (restaurant?.categories ?? []).find((c) => c.id === catParent)?.name
              : null;
            // The heading has to match the button they pressed: pressing
            // "+ Sub-section" on Mains and being shown "New category" reads as
            // if the app ignored the choice.
            if (catModal.cat) return parent ? `Edit sub-section in ${parent}` : "Edit section";
            return parent ? `New sub-section in ${parent}` : "New section";
          })()}
          onClose={() => setCatModal(null)}
        >
          <form onSubmit={saveCategory} className="space-y-4">
            <Field label="Name">
              <input autoFocus required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder={catParent ? "e.g. Kottu" : "e.g. Starters"} className={inputCls} />
            </Field>

            {/*
              Sub-sections are how a long menu stays findable: Mains → Kottu,
              Desserts → Cakes, Beverages → Fresh Juices. Only top-level
              sections can be parents, so the menu never goes three deep.
            */}
            <Field
              label="Where does this go?"
              hint="Put it inside a section to group similar dishes together."
            >
              <select
                value={catParent}
                onChange={(e) => setCatParent(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Top-level section</option>
                {(restaurant?.categories ?? [])
                  .filter(
                    (c) =>
                      !c.parentId &&
                      // A section can't be put inside itself.
                      c.id !== catModal?.cat?.id
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Inside {c.name}
                    </option>
                  ))}
              </select>
            </Field>

            {/* Serving hours: All day by default, native time pickers when limited */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">When is this served?</p>
              <div className="mt-2 flex gap-2">
                {(
                  [
                    [true, "All day"],
                    [false, "Limited hours"],
                  ] as const
                ).map(([allDay, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setCatAllDay(allDay);
                      setCatErr("");
                      if (!allDay && !catFrom && !catTo) {
                        setCatFrom("11:00");
                        setCatTo("22:00");
                      }
                    }}
                    aria-pressed={catAllDay === allDay}
                    className="rounded-full border px-4 py-2 text-xs font-bold transition-colors"
                    style={
                      catAllDay === allDay
                        ? { borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(240,118,46,0.08)" }
                        : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }
                    }
                  >
                    {catAllDay === allDay ? "✓ " : ""}{label}
                  </button>
                ))}
              </div>
              {!catAllDay && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="time"
                    value={catFrom}
                    onChange={(e) => { setCatFrom(e.target.value); setCatErr(""); }}
                    className={`${inputCls} w-36 [color-scheme:dark]`}
                    aria-label="Served from"
                  />
                  <span className="text-sm text-ink-faint">to</span>
                  <input
                    type="time"
                    value={catTo}
                    onChange={(e) => { setCatTo(e.target.value); setCatErr(""); }}
                    className={`${inputCls} w-36 [color-scheme:dark]`}
                    aria-label="Served until"
                  />
                </div>
              )}
              {!catAllDay && (
                <p className="mt-2 text-xs text-ink-faint">
                  Outside these hours the section stays visible but is marked “Served {catFrom || "…"}–{catTo || "…"}”.
                  Overnight windows like 22:00 to 02:00 work too.
                </p>
              )}
              {catErr && <p className="mt-2 text-xs font-semibold" style={{ color: "#ef6a58" }}>{catErr}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setCatModal(null)}>Cancel</Btn>
              <Btn type="submit" loading={catBusy}>{catModal.cat ? "Save" : "Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deleteCat && (
        <Confirm
          title={`Delete “${deleteCat.name}”?`}
          body={(() => {
            const subs = (restaurant?.categories ?? []).filter((c) => c.parentId === deleteCat.id);
            const subDishes = subs.reduce((n, c) => n + c.items.length, 0);
            const dishes = deleteCat.items.length + subDishes;
            const dishText = `${dishes} ${dishes === 1 ? "dish" : "dishes"}`;
            // Without naming the sub-sections an owner deleting "Mains" would
            // expect to lose 7 dishes and actually lose 11 plus two sections.
            return subs.length > 0
              ? `This removes “${deleteCat.name}”, its ${subs.length} sub-section${subs.length === 1 ? "" : "s"} (${subs.map((c) => c.name).join(", ")}) and all ${dishText} inside them. This can't be undone.`
              : `This removes the section and its ${dishText} from your menu. This can't be undone.`;
          })()}
          confirmLabel="Delete category"
          danger
          busy={catBusy}
          onConfirm={removeCategory}
          onCancel={() => setDeleteCat(null)}
        />
      )}

      {/* Dish create/edit drawer */}
      {drawer && restaurant && (
        <DishDrawer
            categories={restaurant?.categories ?? []}
          restaurantId={id}
          categoryId={drawer.categoryId}
          item={drawer.item}
          currencyFmt={fmt}
          onClose={() => setDrawer(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
