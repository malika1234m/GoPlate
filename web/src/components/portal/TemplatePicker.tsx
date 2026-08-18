"use client";

import { MENU_THEMES, paletteOf } from "@/lib/menu-themes";

/**
 * Template chooser with a live preview.
 *
 * The preview matters more than the swatches: a colour chip tells an owner
 * almost nothing about what their menu will look like, and the alternative is
 * save-then-open-the-menu-then-come-back for every option. This renders a real
 * dish card in the selected palette, with their accent and layout applied.
 */
export function TemplatePicker({
  themeId,
  accent,
  layout,
  onSelect,
  onAccent,
}: {
  themeId: string;
  accent: string;
  layout: string;
  onSelect: (id: string) => void;
  onAccent: (hex: string) => void;
}) {
  const selected = MENU_THEMES.find((t) => t.id === themeId) ?? MENU_THEMES[0];
  const p = paletteOf(themeId);

  const groups = [
    { tone: "dark" as const, label: "Dark" },
    { tone: "light" as const, label: "Light" },
  ];

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.tone}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {MENU_THEMES.filter((t) => t.tone === g.tone).map((t) => {
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  aria-pressed={active}
                  className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors"
                  style={
                    active
                      ? { borderColor: "var(--accent)", color: "var(--accent)" }
                      : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }
                  }
                >
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ background: t.swatch, borderColor: "var(--navy-700)" }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Live preview — a real card, not a colour chip */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Preview — {selected.label}
          </p>
          {accent.toLowerCase() !== selected.suggestedAccent.toLowerCase() && (
            <button
              type="button"
              onClick={() => onAccent(selected.suggestedAccent)}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: selected.suggestedAccent }}
              />
              Use the accent that suits {selected.label}
            </button>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ background: p["--m-bg"], borderColor: p["--m-border"] }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-extrabold" style={{ color: p["--m-text"] }}>
              Your Restaurant
            </span>
            <span className="text-[11px] font-semibold" style={{ color: accent }}>
              Ordering open
            </span>
          </div>

          <div
            className={`mt-3 gap-3 ${layout === "grid" ? "grid grid-cols-2" : "flex flex-col"}`}
          >
            {[
              { name: "Charred Ribeye", price: "28.00", desc: "Rosemary butter, vine tomatoes." },
              { name: "Garden Salad", price: "7.00", desc: "Heirloom tomato, herb vinaigrette." },
            ].map((d) => (
              <div
                key={d.name}
                className="flex gap-3 rounded-xl border p-2.5"
                style={{ background: p["--m-surface"], borderColor: p["--m-border"] }}
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-lg"
                  style={{ background: p["--m-raised"] }}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="truncate text-[13px] font-bold"
                      style={{ color: p["--m-text"] }}
                    >
                      {d.name}
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: accent }}>
                      ${d.price}
                    </span>
                  </div>
                  <p
                    className="mt-0.5 line-clamp-2 text-[11px] leading-snug"
                    style={{ color: p["--m-dim"] }}
                  >
                    {d.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: p["--m-faint"] }}>
              Scan · spin · order
            </span>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
              style={{ background: accent }}
            >
              + Add
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
