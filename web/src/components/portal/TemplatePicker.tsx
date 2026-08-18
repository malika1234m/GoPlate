"use client";

import { MENU_THEMES, paletteOf, themeOf, canUseTheme } from "@/lib/menu-themes";
import { canCustomiseAccent, type Plan } from "@/lib/plans";

/**
 * Template chooser with a live preview.
 *
 * The preview matters more than the swatches: a colour chip tells an owner
 * almost nothing about what their menu will look like, and the alternative is
 * save-then-open-the-menu-then-come-back for every option. This renders a real
 * dish card in the selected palette, with their accent and layout applied.
 *
 * Locked templates are shown rather than hidden. An owner who cannot see what
 * Starter adds has no reason to move up, and hiding them makes the Basic plan
 * look thin instead of deliberately simple.
 */
export function TemplatePicker({
  themeId,
  accent,
  layout,
  plan,
  onSelect,
  onAccent,
}: {
  themeId: string;
  accent: string;
  layout: string;
  plan: Plan;
  onSelect: (id: string) => void;
  onAccent: (hex: string) => void;
}) {
  const selected = themeOf(themeId);
  const p = paletteOf(themeId);
  const accentUnlocked = canCustomiseAccent(plan);
  const displayFont = selected.display === "serif" ? "var(--font-fraunces)" : "var(--font-poppins)";

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
          <div className="grid gap-2 sm:grid-cols-2">
            {MENU_THEMES.filter((t) => t.tone === g.tone).map((t) => {
              const active = t.id === themeId;
              const locked = !canUseTheme(plan, t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => !locked && onSelect(t.id)}
                  aria-pressed={active}
                  aria-disabled={locked}
                  title={locked ? "Available on Starter" : undefined}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    locked ? "cursor-not-allowed opacity-55" : ""
                  }`}
                  style={
                    active
                      ? { borderColor: "var(--accent)" }
                      : { borderColor: "var(--navy-700)" }
                  }
                >
                  <span
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-lg border"
                    style={{ background: t.swatch, borderColor: "var(--navy-700)" }}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="text-sm font-bold"
                        style={{ color: active ? "var(--accent)" : "var(--ink)" }}
                      >
                        {t.label}
                      </span>
                      {t.display === "serif" && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint border border-navy-700">
                          Serif
                        </span>
                      )}
                      {locked && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: "rgba(240,118,46,0.16)", color: "var(--accent)" }}
                        >
                          Starter
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-dim">
                      {t.note}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!accentUnlocked && (
        <p
          className="rounded-xl border px-4 py-3 text-xs leading-relaxed"
          style={{ borderColor: "rgba(240,118,46,0.3)", background: "rgba(240,118,46,0.06)", color: "var(--ink-dim)" }}
        >
          On <span className="font-bold text-ink">Basic</span> your menu uses the colours that come
          with each template — they are chosen to stay readable in a dim room. Starter unlocks the
          styled templates and your own accent colour.
        </p>
      )}

      {/* Live preview — a real card, not a colour chip */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Preview — {selected.label}
          </p>
          {accentUnlocked && accent.toLowerCase() !== selected.suggestedAccent.toLowerCase() && (
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
            <span
              className="text-base font-extrabold"
              style={{ color: p["--m-text"], fontFamily: displayFont }}
            >
              Your Restaurant
            </span>
            <span className="text-[11px] font-semibold" style={{ color: accent }}>
              Ordering open
            </span>
          </div>

          <p
            className="mt-2.5 text-sm font-extrabold"
            style={{ color: p["--m-text"], fontFamily: displayFont }}
          >
            Starters
          </p>

          <div className={`mt-2 gap-3 ${layout === "grid" ? "grid grid-cols-2" : "flex flex-col"}`}>
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
