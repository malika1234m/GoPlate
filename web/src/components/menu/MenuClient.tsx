"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { MenuBootOverlay } from "./MenuBootOverlay";
import { paletteOf, displayFontOf } from "@/lib/menu-themes";
import { OrderCart, CartLine, cartKey } from "./OrderCart";

export type PublicModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type PublicModifierGroup = {
  id: string;
  name: string;
  type: string; // single | multi
  required: boolean;
  options: PublicModifierOption[];
};

export type PublicItem = {
  id: string;
  name: string;
  caption: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl: string;
  storyVideoUrl: string;
  modelUrl: string;
  modelUsdzUrl: string;
  modelStatus: string;
  soldOutDate: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  modifierGroups: PublicModifierGroup[];
};

export type PublicCategory = {
  id: string;
  name: string;
  availableFrom: string;
  availableTo: string;
  /** Null for a top-level section; otherwise the section this sits inside. */
  parentId: string | null;
  items: PublicItem[];
};

export type PublicRestaurant = {
  id: string;
  name: string;
  slug: string;
  description: string;
  caption: string;
  address: string;
  phone: string;
  currency: string;
  coverUrl: string;
  logoUrl: string;
  accentColor: string;
  theme: string;
  layout: string;
  showReel: boolean;
};

/* ---------- Owner-selectable menu themes ---------- */

/* Menu palettes live in src/lib/menu-themes.ts — see the note there. */

const poppins = { fontFamily: "var(--font-poppins)" };

function useCurrency(currency: string) {
  return useMemo(() => {
    try {
      // Fixed locale: an undefined locale differs between server and browser,
      // causing a hydration mismatch (e.g. "US$8.50" vs "$8.50").
      return new Intl.NumberFormat("en-US", { style: "currency", currency });
    } catch {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
  }, [currency]);
}

const has3D = (item: PublicItem) => item.modelStatus === "READY" && !!item.modelUrl;

/** All time logic uses the viewer's clock — customers are at the restaurant. */
function localToday(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const isSoldOut = (item: PublicItem, now: Date | null) =>
  now !== null && !!item.soldOutDate && item.soldOutDate === localToday(now);

/** Category serving window; supports overnight ranges like 22:00–02:00. */
function categoryOpen(cat: PublicCategory, now: Date | null): boolean {
  if (now === null || !cat.availableFrom || !cat.availableTo) return true;
  const mins = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = cat.availableFrom.split(":").map(Number);
  const [th, tm] = cat.availableTo.split(":").map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  return from <= to ? mins >= from && mins < to : mins >= from || mins < to;
}

type MediaTab = "3d" | "story" | "spin" | "photo";

function mediaTabs(item: PublicItem): MediaTab[] {
  const tabs: MediaTab[] = [];
  if (has3D(item)) tabs.push("3d");
  if (item.storyVideoUrl) tabs.push("story");
  if (item.videoUrl) tabs.push("spin");
  // The photo is always offered when one exists. It used to be added only as a
  // last resort (`tabs.length === 0`), which meant a dish with a model or a video
  // silently dropped its photo — reachable only as the video poster thumbnail.
  // It stays last so richer media still opens by default.
  if (item.imageUrl) tabs.push("photo");
  return tabs;
}

const TAB_LABELS: Record<MediaTab, string> = {
  "3d": "3D View",
  story: "How it's made",
  spin: "360° View",
  photo: "Photo",
};

/* ---------- Small shared bits ---------- */

function SoldOutRibbon() {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-black/55">
      <span className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider text-white bg-black/70">
        SOLD OUT
      </span>
    </span>
  );
}

function Thumb({ item, className }: { item: PublicItem; className: string }) {
  // Live 3D preview when a model exists — auto-rotates, taps pass through to the card.
  if (has3D(item)) {
    return (
      <div className={className} style={{ pointerEvents: "none", background: "var(--m-raised)" }} aria-hidden>
        <model-viewer
          src={item.modelUrl}
          poster={item.imageUrl || undefined}
          auto-rotate
          auto-rotate-delay="0"
          rotation-per-second="24deg"
          interaction-prompt="none"
          disable-zoom
          shadow-intensity="0.7"
          style={{ width: "100%", height: "100%" }}
          loading="lazy"
        />
      </div>
    );
  }
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt="" className={className} loading="lazy" />;
  }
  const video = item.storyVideoUrl || item.videoUrl;
  if (video) {
    return <video src={video} className={className} muted playsInline preload="metadata" />;
  }
  // No media at all: quiet cutlery mark — never words.
  return (
    <div
      className={`${className} flex items-center justify-center`}
      style={{ color: "var(--m-faint)", background: "var(--m-raised)" }}
      aria-hidden
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v4M9 3v4M16 3c-1.5 1.5-2 3.5-2 6 0 2 .8 3 2 3v9M16 3v18" />
      </svg>
    </div>
  );
}

function MediaBadge({ item }: { item: PublicItem }) {
  if (!has3D(item) && !item.videoUrl && !item.storyVideoUrl) return null;
  return (
    <span
      className="absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
      style={{ background: "var(--accent)" }}
    >
      {has3D(item) ? "3D" : item.storyVideoUrl ? "video" : "360°"}
    </span>
  );
}

const chev = (dir: "l" | "r") => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {dir === "l" ? <path d="m15 5-7 7 7 7" /> : <path d="m9 5 7 7-7 7" />}
  </svg>
);

/* ---------- Dish stage: full-screen viewer, mockup layout ---------- */

function DishStage({
  items,
  index,
  currency,
  now,
  initialTab,
  onNavigate,
  onClose,
  onAdd,
}: {
  items: PublicItem[];
  index: number;
  currency: Intl.NumberFormat;
  now: Date | null;
  initialTab?: MediaTab;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onAdd?: (item: PublicItem, optionIds: string[], optionNames: string[], unitPrice: number) => void;
}) {
  const item = items[index];
  const soldOut = isSoldOut(item, now);
  const tabs = mediaTabs(item);
  const [tab, setTab] = useState<MediaTab>(
    initialTab && tabs.includes(initialTab) ? initialTab : (tabs[0] ?? "photo")
  );
  const touchX = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate(Math.min(index + 1, items.length - 1));
      if (e.key === "ArrowLeft") onNavigate(Math.max(index - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onNavigate, index, items.length]);

  // Keep the active thumbnail in view
  useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  // Modifier selections: groupId -> selected option ids
  const [sel, setSel] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.modifierGroups) {
      init[g.id] = g.required && g.type === "single" && g.options[0] ? [g.options[0].id] : [];
    }
    return init;
  });

  const pick = (group: PublicModifierGroup, optionId: string) => {
    setSel((s) => {
      const current = s[group.id] ?? [];
      if (group.type === "single") {
        const next = current.includes(optionId) && !group.required ? [] : [optionId];
        return { ...s, [group.id]: next };
      }
      return {
        ...s,
        [group.id]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const total =
    item.price +
    item.modifierGroups.reduce(
      (sum, g) =>
        sum +
        g.options
          .filter((o) => (sel[g.id] ?? []).includes(o.id))
          .reduce((a, o) => a + o.priceDelta, 0),
      0
    );

  const swipeStart = (x: number) => (touchX.current = x);
  const swipeEnd = (x: number) => {
    if (touchX.current === null) return;
    const dx = x - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0 && index < items.length - 1) onNavigate(index + 1);
    if (dx > 0 && index > 0) onNavigate(index - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col rise"
      style={{ background: "var(--m-scrim)", ...poppins }}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 sm:px-8 pt-5 shrink-0">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--m-dim)" }}
        >
          <span aria-hidden>←</span> Back to Menu
        </button>
        <span className="text-xs" style={{ color: "var(--m-faint)" }}>
          {index + 1} / {items.length}
        </span>
      </div>

      {/* Body: info panel + media */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:items-stretch gap-2 px-5 sm:px-8 pt-3">
        {/* Media (first on mobile; fixed height there so the info panel can scroll) */}
        <div
          className="relative order-1 lg:order-2 shrink-0 h-[38vh] lg:h-auto lg:flex-1"
          // Swiping navigates dishes — except in 3D view, where dragging rotates the model
          onTouchStart={tab === "3d" ? undefined : (e) => swipeStart(e.touches[0].clientX)}
          onTouchEnd={tab === "3d" ? undefined : (e) => swipeEnd(e.changedTouches[0].clientX)}
        >
          <div
            aria-hidden
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 h-[30vw] max-h-44 w-[70vw] max-w-lg rounded-[50%] blur-3xl opacity-25"
            style={{ background: "var(--accent)" }}
          />
          <div className="relative h-full w-full">
            {tab === "3d" && (
              <model-viewer
                src={item.modelUrl}
                ios-src={item.modelUsdzUrl || undefined}
                alt={`3D model of ${item.name}`}
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="fixed"
                ar-placement="floor"
                camera-controls
                auto-rotate
                auto-rotate-delay="1200"
                rotation-per-second="24deg"
                shadow-intensity="1"
                exposure="1.05"
                touch-action="pan-y"
                interaction-prompt="none"
                poster={item.imageUrl || undefined}
              >
                <button
                  slot="ar-button"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg"
                  style={{ background: "var(--accent)" }}
                >
                  View on your table
                </button>
              </model-viewer>
            )}
            {(tab === "story" || tab === "spin") && (
              <video
                key={`${item.id}-${tab}`}
                src={tab === "story" ? item.storyVideoUrl : item.videoUrl}
                className="h-full w-full object-contain"
                autoPlay
                loop
                muted
                playsInline
                controls={false}
              />
            )}
            {tab === "photo" &&
              (item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full flex items-center justify-center" style={{ color: "var(--m-faint)" }}>
                  No preview available
                </div>
              ))}
          </div>

          {/* Prev / next on the stage (desktop) */}
          {index > 0 && (
            <button
              onClick={() => onNavigate(index - 1)}
              aria-label="Previous dish"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--m-border)", background: "var(--m-surface)", color: "var(--m-text)" }}
            >
              {chev("l")}
            </button>
          )}
          {index < items.length - 1 && (
            <button
              onClick={() => onNavigate(index + 1)}
              aria-label="Next dish"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--m-border)", background: "var(--m-surface)", color: "var(--m-text)" }}
            >
              {chev("r")}
            </button>
          )}
        </div>

        {/* Info panel — scrolls independently on every screen size */}
        <div
          className="order-2 lg:order-1 flex-1 min-h-0 lg:flex-none lg:w-[360px] lg:shrink-0 overflow-y-auto no-scrollbar rounded-2xl lg:border lg:p-6 py-3"
          style={{ borderColor: "var(--m-border)", background: "transparent" }}
        >
          {soldOut && (
            <p
              className="mb-3 rounded-lg px-3 py-2 text-sm font-semibold text-center"
              style={{ background: "var(--m-raised)", color: "var(--m-dim)" }}
            >
              Sold out today — back tomorrow
            </p>
          )}
          <h2 className="text-3xl font-extrabold leading-tight" style={{ color: "var(--m-text)" }}>
            {item.name}
          </h2>
          {item.caption && (
            <p className="mt-1.5 text-sm italic" style={{ color: "var(--accent)" }}>
              “{item.caption}”
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {item.isVegetarian && (
              <span className="text-xs rounded-full border border-green-600/60 text-green-500 px-2 py-0.5">Vegetarian</span>
            )}
            {item.isSpicy && (
              <span className="text-xs rounded-full border border-red-600/60 text-red-500 px-2 py-0.5">Spicy</span>
            )}
          </div>
          {item.description && (
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--m-dim)" }}>
              {item.description}
            </p>
          )}
          <p className="mt-4 text-4xl font-extrabold" style={{ color: "var(--accent)" }}>
            {currency.format(total)}
          </p>

          {onAdd && !soldOut && (
            <button
              onClick={() => {
                const optionIds = Object.values(sel).flat();
                const optionNames = item.modifierGroups.flatMap((g) =>
                  g.options.filter((o) => (sel[g.id] ?? []).includes(o.id)).map((o) => o.name)
                );
                onAdd(item, optionIds, optionNames, total);
                onClose();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-[15px] font-extrabold text-white transition-transform hover:scale-[1.01]"
              style={{ background: "linear-gradient(100deg, var(--accent), #f5934f)" }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8h12l1.2 12.2a1 1 0 0 1-1 1.1H5.8a1 1 0 0 1-1-1.1L6 8Z" />
                <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
              </svg>
              Add to order — {currency.format(total)}
            </button>
          )}

          {/* Choose your view */}
          {tabs.length > 1 && (
            <>
              <p className="mt-6 text-sm font-bold" style={{ color: "var(--m-text)" }}>
                Choose your view
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors"
                    style={
                      tab === t
                        ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
                        : { borderColor: "var(--m-border)", color: "var(--m-dim)" }
                    }
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Explore hints (3D only) */}
          {tab === "3d" && (
            <div className="mt-6">
              <p className="text-sm font-bold" style={{ color: "var(--m-text)" }}>
                Explore in 3D
              </p>
              <ul className="mt-3 space-y-2.5 text-sm" style={{ color: "var(--m-dim)" }}>
                {["Drag to rotate", "Pinch or scroll to zoom", "Swipe for the next dish"].map((hint) => (
                  <li key={hint} className="flex items-center gap-3">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: "var(--accent)" }}
                    />
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modifiers: live price preview */}
          {item.modifierGroups.map((group) => (
            <div key={group.id} className="mt-6">
              <p className="text-sm font-bold" style={{ color: "var(--m-text)" }}>
                {group.name}
                <span className="ml-2 text-xs font-normal" style={{ color: "var(--m-faint)" }}>
                  {group.required ? "required" : group.type === "multi" ? "pick any" : "pick one"}
                </span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const active = (sel[group.id] ?? []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => pick(group, opt.id)}
                      aria-pressed={active}
                      className="rounded-full px-3.5 py-1.5 text-sm border transition-colors"
                      style={
                        active
                          ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                          : { borderColor: "var(--m-border)", color: "var(--m-dim)" }
                      }
                    >
                      {opt.name}
                      {opt.priceDelta !== 0 && (
                        <span className="ml-1 opacity-80">
                          {opt.priceDelta > 0 ? "+" : "−"}
                          {currency.format(Math.abs(opt.priceDelta))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swipeable dish carousel */}
      <div className="shrink-0 px-5 sm:px-8 pb-5 pt-3">
        <div
          className="rounded-3xl border px-3 py-3 flex items-center gap-2"
          style={{ borderColor: "var(--m-border)", background: "color-mix(in srgb, var(--m-surface) 80%, transparent)" }}
        >
          <button
            onClick={() => index > 0 && onNavigate(index - 1)}
            aria-label="Previous dish"
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--m-border)", color: "var(--m-dim)" }}
          >
            {chev("l")}
          </button>
          <div ref={railRef} className="flex gap-3 overflow-x-auto no-scrollbar snap-x flex-1">
            {items.map((dish, i) => (
              <button
                key={dish.id}
                data-idx={i}
                onClick={() => onNavigate(i)}
                className="shrink-0 snap-start text-center"
              >
                <span
                  className="block h-16 w-24 rounded-xl overflow-hidden border-2"
                  style={{ borderColor: i === index ? "var(--accent)" : "var(--m-border)" }}
                >
                  <Thumb item={dish} className="h-full w-full object-cover" />
                </span>
                <span
                  className="mt-1 block w-24 truncate text-[10px] font-medium"
                  style={{ color: i === index ? "var(--m-text)" : "var(--m-faint)" }}
                >
                  {dish.name}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => index < items.length - 1 && onNavigate(index + 1)}
            aria-label="Next dish"
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--m-border)", color: "var(--m-dim)" }}
          >
            {chev("r")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Kitchen reel ---------- */

function KitchenReel({
  items,
  currency,
  onOpen,
}: {
  items: PublicItem[];
  currency: Intl.NumberFormat;
  onOpen: (item: PublicItem, tab: MediaTab) => void;
}) {
  return (
    <section className="pt-8">
      <h2 className="text-xl font-extrabold flex items-center gap-3" style={{ color: "var(--m-text)", ...poppins }}>
        From our kitchen
        <span className="h-px flex-1" style={{ background: "var(--m-border)" }} aria-hidden />
      </h2>
      <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-2">
        {items.map((item) => {
          const src = item.storyVideoUrl || item.videoUrl;
          const tab: MediaTab = item.storyVideoUrl ? "story" : "spin";
          return (
            <button
              key={item.id}
              onClick={() => onOpen(item, tab)}
              className="relative shrink-0 snap-start w-40 h-60 sm:w-48 sm:h-72 rounded-2xl overflow-hidden border text-left transition-transform duration-200 hover:-translate-y-1"
              style={{ borderColor: "var(--m-border)", background: "var(--m-surface)" }}
              aria-label={`Watch ${item.name}`}
            >
              <video src={src} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline preload="metadata" />
              <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/75 to-transparent">
                <p className="text-white text-sm font-semibold leading-tight">{item.name}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: "var(--accent)" }}>
                  {currency.format(item.price)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Dish cards ---------- */

function DishCard({
  item,
  currency,
  soldOut,
  onOpen,
  onQuickAdd,
  inCart = 0,
}: {
  item: PublicItem;
  currency: Intl.NumberFormat;
  soldOut: boolean;
  onOpen: () => void;
  onQuickAdd?: () => void;
  inCart?: number;
}) {
  return (
    <button
      onClick={onOpen}
      className={`group text-left rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-1 flex flex-col ${soldOut ? "opacity-60" : ""}`}
      style={{
        background: "var(--m-surface)",
        borderColor: inCart > 0 ? "color-mix(in srgb, var(--accent) 55%, transparent)" : "var(--m-border)",
      }}
    >
      <div className="relative m-3 mb-0 rounded-xl overflow-hidden aspect-[4/3]" style={{ background: "var(--m-raised)" }}>
        <Thumb item={item} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <MediaBadge item={item} />
        {soldOut && <SoldOutRibbon />}
      </div>
      <div className="p-4 flex-1 flex flex-col" style={poppins}>
        <h3 className="text-[17px] font-bold leading-snug" style={{ color: "var(--m-text)" }}>
          {item.name}
        </h3>
        {item.caption && (
          <p className="mt-0.5 text-xs italic truncate" style={{ color: "var(--accent)" }}>
            {item.caption}
          </p>
        )}
        {item.description && (
          <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--m-faint)" }}>
            {item.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-lg font-extrabold" style={{ color: "var(--accent)" }}>
            {currency.format(item.price)}
          </span>
          {/* One tap adds simple dishes; dishes with options open the viewer to pick. */}
          <span
            role={onQuickAdd ? "button" : undefined}
            aria-label={onQuickAdd ? `Add ${item.name} to order` : undefined}
            onClick={
              onQuickAdd
                ? (e) => {
                    e.stopPropagation();
                    onQuickAdd();
                  }
                : undefined
            }
            className="flex h-8 min-w-8 items-center justify-center rounded-full border px-1 text-[15px] font-bold leading-none transition-transform hover:scale-110"
            style={
              inCart > 0
                ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                : { borderColor: "var(--accent)", color: "var(--accent)" }
            }
          >
            {inCart > 0 ? `×${inCart}` : "+"}
          </span>
        </div>
      </div>
    </button>
  );
}

function DishRow({
  item,
  currency,
  soldOut,
  onOpen,
  onQuickAdd,
  inCart = 0,
}: {
  item: PublicItem;
  currency: Intl.NumberFormat;
  soldOut: boolean;
  onOpen: () => void;
  onQuickAdd?: () => void;
  inCart?: number;
}) {
  return (
    <button
      onClick={onOpen}
      className={`group w-full text-left flex gap-4 rounded-2xl p-3 border transition-all duration-200 hover:-translate-y-0.5 ${soldOut ? "opacity-60" : ""}`}
      style={{
        background: "var(--m-surface)",
        borderColor: inCart > 0 ? "color-mix(in srgb, var(--accent) 55%, transparent)" : "var(--m-border)",
      }}
    >
      <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-xl overflow-hidden" style={{ background: "var(--m-raised)" }}>
        <Thumb item={item} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <MediaBadge item={item} />
        {soldOut && <SoldOutRibbon />}
      </div>
      <div className="min-w-0 flex-1 py-1" style={poppins}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[16px] font-bold truncate" style={{ color: "var(--m-text)" }}>
            {item.name}
          </h3>
          <span className="shrink-0 font-extrabold" style={{ color: "var(--accent)" }}>
            {currency.format(item.price)}
          </span>
        </div>
        {item.caption && (
          <p className="mt-0.5 text-xs italic truncate" style={{ color: "var(--accent)" }}>
            {item.caption}
          </p>
        )}
        {item.description && (
          <p className="mt-1 text-[13px] line-clamp-2" style={{ color: "var(--m-faint)" }}>
            {item.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--m-faint)" }}>
          {item.isVegetarian && <span className="text-green-500">● veg</span>}
          {item.isSpicy && <span className="text-red-500">● spicy</span>}
          {(onQuickAdd || inCart > 0) && (
            <span
              role={onQuickAdd ? "button" : undefined}
              aria-label={onQuickAdd ? `Add ${item.name} to order` : undefined}
              onClick={
                onQuickAdd
                  ? (e) => {
                      e.stopPropagation();
                      onQuickAdd();
                    }
                  : undefined
              }
              className="ml-auto rounded-full border px-3 py-1 text-[11px] font-bold transition-transform hover:scale-105"
              style={
                inCart > 0
                  ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                  : { borderColor: "var(--accent)", color: "var(--accent)" }
              }
            >
              {inCart > 0 ? `${inCart} in order` : "+ Add"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ---------- Sidebar icon ---------- */

const catIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

/* ---------- Full menu page ---------- */

export function MenuClient({
  restaurant,
  orderingEnabled = false,
}: {
  restaurant: PublicRestaurant & { categories: PublicCategory[] };
  orderingEnabled?: boolean;
}) {
  const currency = useCurrency(restaurant.currency);
  const theme = paletteOf(restaurant.theme);
  // Templates choose their headline face; body copy stays on the UI font.
  const display = { fontFamily: displayFontOf(restaurant.theme) };

  /**
   * The menu arrives flat; group it into section → sub-section here.
   *
   * A section is kept when it has dishes of its own OR any sub-section with
   * dishes — otherwise "Beverages" would vanish while "Beer" and "Juices" were
   * still full, because the parent itself holds no items.
   */
  const withItems = restaurant.categories.filter((c) => c.items.length > 0);
  const sections = restaurant.categories
    .filter((c) => !c.parentId)
    .map((parent) => ({
      ...parent,
      children: withItems.filter((c) => c.parentId === parent.id),
    }))
    .filter((s) => s.items.length > 0 || s.children.length > 0);

  // Flat list of everything renderable, used by the reel, search and counts.
  const categories = sections.flatMap((s) =>
    s.items.length > 0 ? [s as PublicCategory, ...s.children] : s.children
  );
  const allItems = categories.flatMap((c) => c.items);

  const [stage, setStage] = useState<{ index: number; tab?: MediaTab } | null>(null);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">(restaurant.layout === "list" ? "list" : "grid");
  const [vegOnly, setVegOnly] = useState(false);
  const [query, setQuery] = useState("");

  // Time-based state (serving windows, sold-out) activates after hydration.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  /**
   * Search runs over the copy already on the page — the entire menu ships with
   * the first render, so a server round trip per keystroke would only add
   * latency. Name, caption and description are all searched: a diner hunting
   * "cheese" should find a dish whose description mentions it.
   */
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const searchResults = searching
    ? categories.flatMap((cat) =>
        cat.items
          .filter((i) =>
            [i.name, i.caption, i.description].some((f) => f?.toLowerCase().includes(q))
          )
          .filter((i) => !vegOnly || i.isVegetarian)
          .map((item) => ({
            item,
            // The trail teaches the menu's shape while they search: a diner who
            // finds "Chicken Kottu" under "Mains › Kottu" now knows where to
            // look for more of the same.
            trail: cat.parentId
              ? `${sections.find((sec) => sec.id === cat.parentId)?.name ?? ""} › ${cat.name}`
              : cat.name,
          }))
      )
    : [];

  const selectedSection = sections.find((sec) => sec.id === activeCat);
  const visibleCategories = categories
    .filter((c) =>
      activeCat === "all" ||
      c.id === activeCat ||
      // Picking "Mains" keeps Tandoori and Kottu on screen too.
      (selectedSection ? c.parentId === selectedSection.id : false)
    )
    .map((c) => ({ ...c, items: vegOnly ? c.items.filter((i) => i.isVegetarian) : c.items }))
    .filter((c) => c.items.length > 0);

  const reelItems = restaurant.showReel
    ? allItems.filter((i) => i.storyVideoUrl || i.videoUrl).slice(0, 12)
    : [];

  const openItem = (item: PublicItem, tab?: MediaTab) => {
    const index = allItems.findIndex((i) => i.id === item.id);
    if (index >= 0) setStage({ index, tab });
  };

  // ---------- Ordering (Pro menus) ----------
  const [cart, setCart] = useState<CartLine[]>([]);
  const addToCart = (
    item: PublicItem,
    optionIds: string[],
    optionNames: string[],
    unitPrice: number
  ) => {
    const key = cartKey(item.id, optionIds);
    setCart((c) => {
      const existing = c.find((l) => l.key === key);
      if (existing) {
        return c.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...c,
        { key, itemId: item.id, name: item.name, imageUrl: item.imageUrl, unitPrice, quantity: 1, optionIds, optionNames },
      ];
    });
  };
  const changeQty = (key: string, delta: number) =>
    setCart((c) =>
      c
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );

  // Simple dishes (no options) can be added straight from the card; dishes
  // with options open the viewer so the customer picks first.
  const quickAddFor = (item: PublicItem) =>
    orderingEnabled && item.modifierGroups.length === 0 && !isSoldOut(item, now)
      ? () => addToCart(item, [], [], item.price)
      : undefined;
  const cartQty = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of cart) m[l.itemId] = (m[l.itemId] ?? 0) + l.quantity;
    return m;
  }, [cart]);

  const sidebarEntries: { id: string; name: string; count: number; depth: number }[] = [
    { id: "all", name: "All Items", count: allItems.length, depth: 0 },
    ...sections.flatMap((sec) => {
      // A section's count includes its sub-sections, which is what a diner
      // means by "how many mains are there".
      const own = sec.items.length;
      const total = own + sec.children.reduce((n, c) => n + c.items.length, 0);
      return [
        { id: sec.id, name: sec.name, count: total, depth: 0 },
        ...sec.children.map((c) => ({ id: c.id, name: c.name, count: c.items.length, depth: 1 })),
      ];
    }),
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        ...(theme as React.CSSProperties),
        ["--accent" as string]: restaurant.accentColor || "#f0762e",
        background: "var(--m-bg)",
        color: "var(--m-text)",
      }}
    >
      <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />

      {/* Branded boot screen — stays up until images/fonts are actually ready */}
      <MenuBootOverlay />

      {/* Top bar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--m-bg) 88%, transparent)", borderColor: "var(--m-border)" }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 px-5 sm:px-8 py-4">
          <span className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover border-2 shrink-0"
                style={{ borderColor: "var(--accent)" }}
              />
            )}
            <span className="min-w-0">
              <span className="block text-lg font-extrabold truncate" style={display}>
                {restaurant.name}
              </span>
              {restaurant.caption && (
                <span className="block text-xs italic truncate" style={{ color: "var(--accent)" }}>
                  {restaurant.caption}
                </span>
              )}
            </span>
          </span>
          {restaurant.address && (
            <span className="hidden md:block text-xs text-right" style={{ color: "var(--m-faint)" }}>
              {restaurant.address}
              {restaurant.phone ? <><br />{restaurant.phone}</> : null}
            </span>
          )}
        </div>
      </header>

      {/* Extra bottom room so the floating cart bar never covers the last dishes */}
      <div className={`max-w-[1400px] mx-auto px-5 sm:px-8 flex gap-8 ${cart.length > 0 ? "pb-44" : "pb-20"}`}>
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-60 shrink-0 pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent)", ...poppins }}>
            Categories
          </p>
          <nav
            className="mt-4 rounded-2xl border p-2 space-y-1"
            style={{ borderColor: "var(--m-border)", background: "var(--m-surface)" }}
          >
            {sidebarEntries.map((entry) => {
              const active = activeCat === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => setActiveCat(entry.id)}
                  className={`w-full flex items-center gap-3 rounded-xl py-3 text-sm border transition-colors ${
                    entry.depth > 0 ? "pl-8 pr-3.5 font-medium" : "px-3.5 font-semibold"
                  }`}
                  style={
                    active
                      ? { borderColor: "var(--accent)", color: "var(--m-text)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                      : { borderColor: "transparent", color: "var(--m-dim)" }
                  }
                >
                  {entry.depth === 0 && (
                    <span style={{ color: active ? "var(--accent)" : "var(--m-faint)" }}>{catIcon}</span>
                  )}
                  <span className="flex-1 text-left truncate" style={poppins}>{entry.name}</span>
                  <span className="text-xs" style={{ color: "var(--m-faint)" }}>{entry.count}</span>
                </button>
              );
            })}
          </nav>

          <div
            className="mt-6 rounded-2xl border p-5"
            style={{ borderColor: "var(--m-border)", background: "var(--m-surface)" }}
          >
            <p className="text-sm font-bold" style={{ ...poppins }}>
              Experience every detail in 3D
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--m-faint)" }}>
              Rotate, zoom and explore each dish before you order. Tap any dish to open it.
            </p>
          </div>

          {orderingEnabled && (
            <div
              className="mt-4 rounded-2xl border p-5"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
                background: "color-mix(in srgb, var(--accent) 6%, var(--m-surface))",
              }}
            >
              <p className="text-sm font-bold flex items-center gap-2" style={{ ...poppins }}>
                <span style={{ color: "var(--accent)" }} aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8h12l1.2 12.2a1 1 0 0 1-1 1.1H5.8a1 1 0 0 1-1-1.1L6 8Z" />
                    <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
                  </svg>
                </span>
                Order from your seat
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--m-faint)" }}>
                Build your order right here and send it straight to the kitchen. Pay at the venue —
                no app, no sign-up.
              </p>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Heading + view controls */}
          <div className="pt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold" style={display}>
                Our Full Menu
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--m-faint)" }}>
                Explore our delicious dishes in immersive 3D
              </p>
              {orderingEnabled && (
                <span
                  className="mt-2.5 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-bold"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
                    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                    color: "var(--accent)",
                    ...poppins,
                  }}
                >
                  <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--accent)" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                  </span>
                  Ordering open — tap + to order from your seat
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["grid", "Grid"],
                  ["list", "List"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setView(value)}
                  className="rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-semibold border transition-colors"
                  style={
                    view === value
                      ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
                      : { borderColor: "var(--m-border)", color: "var(--m-dim)" }
                  }
                >
                  {label}
                  <span className="hidden sm:inline"> View</span>
                </button>
              ))}
              <div className="relative order-first w-full sm:order-none sm:w-56">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dishes…"
                  aria-label="Search dishes"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                  style={{
                    borderColor: searching ? "var(--accent)" : "var(--m-border)",
                    background: "var(--m-surface)",
                    color: "var(--m-text)",
                  }}
                />
                {searching && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold"
                    style={{ color: "var(--m-faint)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                onClick={() => setVegOnly((v) => !v)}
                aria-pressed={vegOnly}
                className="rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-semibold border transition-colors"
                style={
                  vegOnly
                    ? { borderColor: "#4ade80", color: "#4ade80", background: "rgba(74,222,128,0.1)" }
                    : { borderColor: "var(--m-border)", color: "var(--m-dim)" }
                }
              >
                Veg only
              </button>
            </div>
          </div>

          {/* Category chips (mobile) */}
          <div className="lg:hidden mt-5 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {sidebarEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setActiveCat(entry.id)}
                className="shrink-0 rounded-full px-4 py-1.5 text-sm border transition-colors"
                style={
                  activeCat === entry.id
                    ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff", fontWeight: 600 }
                    : { borderColor: "var(--m-border)", color: "var(--m-dim)" }
                }
              >
                {entry.name}
              </button>
            ))}
          </div>

          {/* While searching, the reel and the section list step aside — a diner
              hunting for one dish does not want to scroll past a video strip. */}
          {!searching && activeCat === "all" && !vegOnly && reelItems.length > 0 && (
            <KitchenReel items={reelItems} currency={currency} onOpen={openItem} />
          )}

          {searching && (
            <section className="pt-8">
              <h2 className="flex items-center gap-3 text-xl font-extrabold" style={display}>
                {searchResults.length > 0
                  ? `${searchResults.length} ${searchResults.length === 1 ? "dish" : "dishes"} matching “${query.trim()}”`
                  : "Nothing matched"}
                <span className="h-px flex-1" style={{ background: "var(--m-border)" }} aria-hidden />
              </h2>

              {searchResults.length === 0 ? (
                <p className="py-14 text-center" style={{ color: "var(--m-faint)" }}>
                  No dish matches “{query.trim()}”
                  {vegOnly ? " in the vegetarian dishes" : ""}. Try a shorter word, or{" "}
                  <button onClick={() => setQuery("")} className="font-semibold underline" style={{ color: "var(--accent)" }}>
                    browse the full menu
                  </button>
                  .
                </p>
              ) : (
                <div
                  className={`mt-4 ${
                    view === "grid"
                      ? "grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                      : "grid gap-3 grid-cols-1 xl:grid-cols-2"
                  }`}
                >
                  {searchResults.map(({ item, trail }) => (
                    <div key={item.id}>
                      <p
                        className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--m-faint)" }}
                      >
                        {trail}
                      </p>
                      {view === "grid" ? (
                        <DishCard
                          item={item}
                          currency={currency}
                          soldOut={isSoldOut(item, now)}
                          onOpen={() => openItem(item)}
                          onQuickAdd={quickAddFor(item)}
                          inCart={orderingEnabled ? (cartQty[item.id] ?? 0) : 0}
                        />
                      ) : (
                        <DishRow
                          item={item}
                          currency={currency}
                          soldOut={isSoldOut(item, now)}
                          onOpen={() => openItem(item)}
                          onQuickAdd={quickAddFor(item)}
                          inCart={orderingEnabled ? (cartQty[item.id] ?? 0) : 0}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {!searching && visibleCategories.length === 0 && (
            <p className="text-center py-20" style={{ color: "var(--m-faint)" }}>
              {vegOnly ? "No vegetarian dishes in this section." : "This menu is being prepared. Check back soon."}
            </p>
          )}

          {!searching && visibleCategories.map((cat) => {
            const open = categoryOpen(cat, now);
            const parentName = cat.parentId
              ? sections.find((sec) => sec.id === cat.parentId)?.name
              : null;
            return (
              <section key={cat.id} className={parentName ? "pt-6" : "pt-9"}>
                <h2
                  className={`flex items-center gap-3 ${
                    parentName ? "text-base font-bold" : "text-xl font-extrabold"
                  }`}
                  style={display}
                >
                  {parentName && (
                    <span className="font-normal" style={{ color: "var(--m-faint)" }}>
                      {parentName} ›
                    </span>
                  )}
                  {cat.name}
                  {cat.availableFrom && cat.availableTo && (
                    <span
                      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                      style={
                        open
                          ? { borderColor: "var(--accent)", color: "var(--accent)" }
                          : { borderColor: "var(--m-border)", color: "var(--m-faint)" }
                      }
                    >
                      {open ? "Serving now" : `Served ${cat.availableFrom}–${cat.availableTo}`}
                    </span>
                  )}
                  <span className="h-px flex-1" style={{ background: "var(--m-border)" }} aria-hidden />
                  <span className="text-xs font-normal" style={{ color: "var(--m-faint)" }}>
                    {cat.items.length} {cat.items.length === 1 ? "dish" : "dishes"}
                  </span>
                </h2>
                <div
                  className={`mt-4 ${
                    view === "grid"
                      ? "grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                      : "grid gap-3 grid-cols-1 xl:grid-cols-2"
                  } ${open ? "" : "opacity-50"}`}
                >
                  {cat.items.map((item) =>
                    view === "grid" ? (
                      <DishCard
                        key={item.id}
                        item={item}
                        currency={currency}
                        soldOut={isSoldOut(item, now)}
                        onOpen={() => openItem(item)}
                        onQuickAdd={quickAddFor(item)}
                        inCart={orderingEnabled ? (cartQty[item.id] ?? 0) : 0}
                      />
                    ) : (
                      <DishRow
                        key={item.id}
                        item={item}
                        currency={currency}
                        soldOut={isSoldOut(item, now)}
                        onOpen={() => openItem(item)}
                        onQuickAdd={quickAddFor(item)}
                        inCart={orderingEnabled ? (cartQty[item.id] ?? 0) : 0}
                      />
                    )
                  )}
                </div>
              </section>
            );
          })}

          {/* Bottom info bar */}
          <div
            className="mt-14 rounded-2xl border px-6 py-5 flex flex-wrap items-center gap-4"
            style={{ borderColor: "var(--m-border)", background: "var(--m-surface)" }}
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl border shrink-0"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
                <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
                <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
                <path d="M14 14h2.8v2.8H14zM17.8 17.8h2.7v2.7h-2.7z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1" style={poppins}>
              <p className="text-sm font-bold">Scanned the QR at your table?</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--m-faint)" }}>
                No app required. Just tap a dish and explore it in 3D.
              </p>
            </div>
            <span className="text-xs" style={{ color: "var(--m-faint)" }}>
              Powered by <span style={{ color: "var(--accent)" }}>GoPlate</span>
            </span>
          </div>
        </main>
      </div>

      {stage && (
        <DishStage
          onAdd={orderingEnabled ? addToCart : undefined}
          key={allItems[stage.index]?.id}
          items={allItems}
          index={stage.index}
          currency={currency}
          now={now}
          initialTab={stage.tab}
          onNavigate={(index) => setStage({ index })}
          onClose={() => setStage(null)}
        />
      )}

      {orderingEnabled && (
        <OrderCart
          cart={cart}
          currency={currency}
          slug={restaurant.slug}
          restaurantName={restaurant.name}
          onChangeQty={changeQty}
          onClear={() => setCart([])}
        />
      )}

    </div>
  );
}
