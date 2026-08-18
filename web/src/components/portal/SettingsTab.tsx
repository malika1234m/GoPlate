"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Restaurant } from "@/lib/portal";
import { Btn, Confirm, CurrencySelect, ErrorNote, Field, inputCls } from "@/components/portal/ui";
import { TemplatePicker } from "@/components/portal/TemplatePicker";

export function SettingsTab({
  restaurant,
  onSaved,
}: {
  restaurant: Restaurant;
  onSaved: () => Promise<void> | void;
}) {
  const router = useRouter();
  const [name, setName] = useState(restaurant.name);
  const [caption, setCaption] = useState(restaurant.caption);
  const [description, setDescription] = useState(restaurant.description);
  const [address, setAddress] = useState(restaurant.address);
  const [phone, setPhone] = useState(restaurant.phone);
  const [currency, setCurrency] = useState(restaurant.currency);
  const [theme, setTheme] = useState(restaurant.theme);
  const [layout, setLayout] = useState(restaurant.layout);
  const [accent, setAccent] = useState(restaurant.accentColor || "#f0762e");
  const [showReel, setShowReel] = useState(restaurant.showReel);
  const [published, setPublished] = useState(restaurant.isPublished);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api.updateRestaurant(restaurant.id, {
        name: name.trim(),
        caption: caption.trim(),
        description: description.trim(),
        address: address.trim(),
        phone: phone.trim(),
        currency: currency.trim().toUpperCase() || "USD",
        theme,
        layout,
        accentColor: accent,
        showReel,
        isPublished: published,
      });
      await onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setDeleteBusy(true);
    try {
      await api.deleteRestaurant(restaurant.id);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the restaurant.");
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <section className="mt-6 max-w-2xl">
      <form onSubmit={save} className="space-y-5">
        {/* Publish switch */}
        <div className="flex items-center justify-between rounded-2xl border border-navy-700 bg-navy-900 p-5">
          <div>
            <p className="text-sm font-bold text-ink">Menu is {published ? "live" : "a draft"}</p>
            <p className="mt-1 text-xs text-ink-faint">
              {published
                ? "Customers with the link or QR can see it."
                : "Only you can see it until you publish."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={published}
            onClick={() => setPublished(!published)}
            className="relative h-7 w-12 rounded-full transition-colors"
            style={{ background: published ? "var(--accent)" : "var(--navy-700)" }}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: published ? 26 : 4 }}
            />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Restaurant name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Caption" hint="Shown under your name on the menu.">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Plates worth turning around" maxLength={160} className={inputCls} />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Currency">
            <CurrencySelect value={currency} onChange={setCurrency} />
          </Field>
        </div>

        {/* Look & feel */}
        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5 space-y-4">
          <p className="text-sm font-bold text-ink">Menu look &amp; feel</p>
          <TemplatePicker
            themeId={theme}
            accent={accent}
            layout={layout}
            onSelect={setTheme}
            onAccent={setAccent}
          />

          <div className="flex flex-wrap items-center gap-2">
            {(["list", "grid"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayout(l)}
                aria-pressed={layout === l}
                className="rounded-full border px-4 py-2 text-xs font-bold capitalize"
                style={
                  layout === l
                    ? { borderColor: "var(--accent)", color: "var(--accent)" }
                    : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }
                }
              >
                {l} layout
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-sm text-ink-dim">
              Accent color
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-navy-700 bg-navy-800" />
              <span className="text-xs text-ink-faint">{accent}</span>
            </label>
            <button
              type="button"
              onClick={() => setShowReel(!showReel)}
              aria-pressed={showReel}
              className="rounded-full border px-4 py-2 text-xs font-bold"
              style={showReel ? { borderColor: "var(--accent)", color: "var(--accent)" } : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }}
            >
              {showReel ? "✓ " : ""}“From our kitchen” video reel
            </button>
          </div>
        </div>

        <ErrorNote message={error} />
        <div className="flex items-center gap-4">
          <Btn type="submit" loading={busy}>Save settings</Btn>
          {saved && <span className="text-sm font-semibold text-emerald-400">Saved ✓</span>}
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-12 rounded-2xl border border-red-500/25 p-5">
        <p className="text-sm font-bold text-ink">Danger zone</p>
        <p className="mt-1 text-xs text-ink-faint">
          Deleting the restaurant removes the menu, all dishes, media, and orders permanently.
        </p>
        <div className="mt-4">
          <Btn variant="danger" small onClick={() => setConfirmDelete(true)}>Delete this restaurant</Btn>
        </div>
      </div>

      {confirmDelete && (
        <Confirm
          title={`Delete ${restaurant.name}?`}
          body="Everything — menu, dishes, media, orders, and the public page — is removed permanently. This cannot be undone."
          confirmLabel="Delete permanently"
          danger
          busy={deleteBusy}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
}
