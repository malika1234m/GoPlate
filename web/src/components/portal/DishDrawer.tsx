"use client";

import { useRef, useState } from "react";
import { api, MenuItem, ModifierGroup } from "@/lib/portal";
import { Btn, Confirm, ErrorNote, Field, inputCls, Modal } from "@/components/portal/ui";

/**
 * Create/edit a dish. Text fields save on "Save dish"; media, 3D, sold-out
 * and option groups act immediately (same model as the mobile app).
 * Story video and 3D need a saved dish first. Option groups do not: on a new
 * dish they're staged as `DraftGroup`s and written once the item has an id.
 */
export type DraftGroup = {
  name: string;
  type: string;
  required: boolean;
  options: { name: string; priceDelta: number }[];
};

export function DishDrawer({
  restaurantId,
  categoryId,
  item,
  currencyFmt,
  onClose,
  onChanged,
}: {
  restaurantId: string;
  categoryId: string;
  item?: MenuItem;
  currencyFmt: (n: number) => string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const isEdit = !!item;
  const [current, setCurrent] = useState<MenuItem | undefined>(item);
  const [name, setName] = useState(item?.name ?? "");
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [veg, setVeg] = useState(item?.isVegetarian ?? false);
  const [spicy, setSpicy] = useState(item?.isSpicy ?? false);
  const [visible, setVisible] = useState(item?.isAvailable ?? true);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(item?.videoUrl ?? "");

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"" | "photo" | "video" | "story">("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<null | { title: string; body: string; label: string; run: () => Promise<void> }>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modifierModal, setModifierModal] = useState<null | { group?: ModifierGroup; draftIndex?: number }>(null);

  // Option groups for a dish that doesn't exist yet. The API keys groups to an
  // item id, so on a new dish they're held here and POSTed straight after the
  // item is created.
  const [draftGroups, setDraftGroups] = useState<DraftGroup[]>([]);

  const photoInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const storyInput = useRef<HTMLInputElement | null>(null);

  const refreshItem = async () => {
    if (!current) return;
    const { item: fresh } = await api.item(current.id);
    setCurrent(fresh);
  };

  const soldOutToday = !!current?.soldOutDate && current.soldOutDate === new Date().toISOString().slice(0, 10);

  /* ---------- media ---------- */

  const pickUpload = async (kind: "photo" | "video", file: File) => {
    setUploading(kind);
    setError("");
    try {
      const { url } = await api.upload(file);
      if (kind === "photo") setImageUrl(url);
      else setVideoUrl(url);
      // On an existing dish, persist immediately so nothing "reappears".
      if (current) {
        const { item: updated } = await api.updateItem(current.id, kind === "photo" ? { imageUrl: url } : { videoUrl: url });
        setCurrent(updated);
        await onChanged();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading("");
    }
  };

  const pickStory = async (file: File) => {
    if (!current) return;
    setUploading("story");
    setError("");
    try {
      const { item: updated } = await api.uploadStoryVideo(current.id, file);
      setCurrent(updated);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading("");
    }
  };

  const removeMedia = (kind: "photo" | "video" | "story") => {
    const labels = { photo: "photo", video: "360° video", story: "“How it's made” video" };
    setConfirm({
      title: `Remove this ${labels[kind]}?`,
      body: "It will no longer appear on your menu.",
      label: "Remove",
      run: async () => {
        if (kind === "photo") {
          setImageUrl("");
          if (current) setCurrent((await api.updateItem(current.id, { imageUrl: "" })).item);
        } else if (kind === "video") {
          setVideoUrl("");
          if (current) setCurrent((await api.updateItem(current.id, { videoUrl: "" })).item);
        } else if (current) {
          setCurrent((await api.removeStoryVideo(current.id)).item);
        }
        await onChanged();
      },
    });
  };

  /* ---------- 3D ---------- */

  const generate3d = async () => {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const { item: updated } = await api.generate3d(current.id);
      setCurrent(updated);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "3D generation is not available right now.");
    } finally {
      setBusy(false);
    }
  };

  const remove3d = () =>
    setConfirm({
      title: "Remove the 3D model?",
      body: "Customers will see the photo or video instead. This frees a 3D slot on your plan.",
      label: "Remove 3D model",
      run: async () => {
        if (!current) return;
        setCurrent((await api.remove3d(current.id)).item);
        await onChanged();
      },
    });

  /* ---------- save / delete ---------- */

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price.");
      setBusy(false);
      return;
    }
    const body = {
      name: name.trim(),
      caption: caption.trim(),
      description: description.trim(),
      price: priceNum,
      isVegetarian: veg,
      isSpicy: spicy,
      isAvailable: visible,
      imageUrl,
      videoUrl,
    };
    try {
      if (current) {
        await api.updateItem(current.id, body);
      } else {
        const { item: created } = await api.createItem(restaurantId, { categoryId, ...body });
        // Groups can only be attached once the dish has an id. If one fails we
        // keep the drawer open on the created dish rather than closing, so the
        // owner can see which groups landed instead of silently losing them.
        for (let i = 0; i < draftGroups.length; i++) {
          try {
            await api.createModifierGroup(created.id, draftGroups[i]);
          } catch (err) {
            setCurrent(created);
            setDraftGroups(draftGroups.slice(i));
            await onChanged();
            setError(
              err instanceof Error
                ? `Dish saved, but "${draftGroups[i].name}" didn't: ${err.message}`
                : `Dish saved, but "${draftGroups[i].name}" didn't save.`
            );
            setBusy(false);
            return;
          }
        }
      }
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the dish.");
      setBusy(false);
    }
  };

  const deleteDish = async () => {
    if (!current) return;
    setConfirmBusy(true);
    try {
      await api.deleteItem(current.id);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the dish.");
      setDeleting(false);
      setConfirmBusy(false);
    }
  };

  const toggleSoldOut = async () => {
    if (!current) return;
    setBusy(true);
    try {
      setCurrent((await api.updateItem(current.id, { soldOutToday: !soldOutToday })).item);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit dish" : "New dish"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Dish name">
            <input autoFocus={!isEdit} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Fire-Grilled Burger" className={inputCls} />
          </Field>
          <Field label="Price">
            <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12.50" className={inputCls} />
          </Field>
        </div>
        <Field label="Caption (optional)" hint="A short line under the name — “Our signature since day one”.">
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={160} className={inputCls} />
        </Field>
        <Field label="Description (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} className={inputCls} />
        </Field>

        {/* Flags */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Vegetarian", veg, setVeg],
              ["Spicy", spicy, setSpicy],
              ["Visible on menu", visible, setVisible],
            ] as const
          ).map(([label, value, set]) => (
            <button
              key={label}
              type="button"
              onClick={() => set(!value)}
              aria-pressed={value}
              className="rounded-full border px-4 py-2 text-xs font-bold transition-colors"
              style={
                value
                  ? { borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(240,118,46,0.08)" }
                  : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }
              }
            >
              {value ? "✓ " : ""}{label}
            </button>
          ))}
          {isEdit && (
            <button
              type="button"
              onClick={toggleSoldOut}
              aria-pressed={soldOutToday}
              className="rounded-full border px-4 py-2 text-xs font-bold transition-colors"
              style={
                soldOutToday
                  ? { borderColor: "#ef6a58", color: "#ef6a58", background: "rgba(224,82,63,0.08)" }
                  : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }
              }
            >
              {soldOutToday ? "✓ Sold out today" : "Mark sold out today"}
            </button>
          )}
        </div>

        {/* Media */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Media</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div>
              <MediaTile kind="photo" url={imageUrl} hint="Add photo" uploading={uploading} onPick={() => photoInput.current?.click()} onRemove={() => removeMedia("photo")} />
              <p className="mt-1.5 text-[11px] text-ink-faint">Photo — shows on every plan</p>
            </div>
            <div>
              <MediaTile kind="video" url={videoUrl} hint="Add 360° video" uploading={uploading} onPick={() => videoInput.current?.click()} onRemove={() => removeMedia("video")} />
              <p className="mt-1.5 text-[11px] text-ink-faint">360° video — film a slow circle around the plate</p>
            </div>
            <div>
              {current ? (
                <>
                  <MediaTile kind="story" url={current.storyVideoUrl} hint="Add video" uploading={uploading} onPick={() => storyInput.current?.click()} onRemove={() => removeMedia("story")} />
                  <p className="mt-1.5 text-[11px] text-ink-faint">“How it&apos;s made” — we auto-edit it into a short clip</p>
                </>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-navy-700 p-3 text-center text-[11px] text-ink-faint">
                  Save the dish first to add a “How it&apos;s made” video and 3D
                </div>
              )}
            </div>
          </div>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && pickUpload("photo", e.target.files[0])} />
          <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => e.target.files?.[0] && pickUpload("video", e.target.files[0])} />
          <input ref={storyInput} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => e.target.files?.[0] && pickStory(e.target.files[0])} />
        </div>

        {/* 3D */}
        {current && (
          <div className="rounded-2xl border border-navy-700 bg-navy-800/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">
                  3D model{" "}
                  {current.modelStatus === "READY" && <span className="ml-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">LIVE ON MENU</span>}
                  {current.modelStatus === "PROCESSING" && <span className="ml-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-400">PROCESSING</span>}
                </p>
                <p className="mt-1 text-xs text-ink-faint">Customers spin, tilt, and place the dish on their table in AR.</p>
              </div>
              {current.modelStatus === "READY" ? (
                <Btn small variant="danger" onClick={remove3d}>Remove 3D model</Btn>
              ) : current.modelStatus === "PROCESSING" ? (
                <span className="text-xs text-ink-faint">Usually ready in a few minutes…</span>
              ) : (
                <Btn small variant="secondary" onClick={generate3d} loading={busy} disabled={!videoUrl && !imageUrl}>
                  Generate from {videoUrl ? "video" : "photo"}
                </Btn>
              )}
            </div>
          </div>
        )}

        {/* Option groups — available on a new dish too; drafts are saved with it. */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Options (size, toppings…)</p>
            <Btn small variant="secondary" onClick={() => setModifierModal({})}>+ Add group</Btn>
          </div>
          <div className="mt-2 space-y-2">
            {current
              ? (current.modifierGroups ?? []).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setModifierModal({ group: g })}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-left hover:border-accent/60"
                  >
                    <span>
                      <span className="text-sm font-bold text-ink">{g.name}</span>
                      <span className="ml-2 text-xs text-ink-faint">
                        {g.type === "single" ? "pick one" : "pick any"}{g.required ? " · required" : ""}
                      </span>
                    </span>
                    <span className="truncate text-xs text-ink-faint">
                      {g.options.map((o) => o.name).join(" · ")}
                    </span>
                  </button>
                ))
              : draftGroups.map((g, i) => (
                  <button
                    key={`draft-${i}`}
                    type="button"
                    onClick={() => setModifierModal({ draftIndex: i })}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-left hover:border-accent/60"
                  >
                    <span>
                      <span className="text-sm font-bold text-ink">{g.name}</span>
                      <span className="ml-2 text-xs text-ink-faint">
                        {g.type === "single" ? "pick one" : "pick any"}{g.required ? " · required" : ""}
                      </span>
                    </span>
                    <span className="truncate text-xs text-ink-faint">
                      {g.options.map((o) => o.name).join(" · ")}
                    </span>
                  </button>
                ))}
            {(current ? (current.modifierGroups ?? []).length : draftGroups.length) === 0 && (
              <p className="rounded-xl border border-dashed border-navy-700 px-4 py-3 text-xs text-ink-faint">
                No option groups yet — add “Size” or “Toppings” and customers pick when ordering.
              </p>
            )}
          </div>
        </div>

        <ErrorNote message={error} />

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-800 pt-5">
          {isEdit ? (
            <Btn variant="danger" onClick={() => setDeleting(true)}>Delete dish</Btn>
          ) : <span />}
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn type="submit" loading={busy && !confirm}>{isEdit ? "Save dish" : `Add dish${price ? ` — ${currencyFmt(Number(price) || 0)}` : ""}`}</Btn>
          </div>
        </div>
      </form>

      {confirm && (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.label}
          danger
          busy={confirmBusy}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirmBusy(true);
            try {
              await confirm.run();
              setConfirm(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong.");
            } finally {
              setConfirmBusy(false);
            }
          }}
        />
      )}

      {deleting && current && (
        <Confirm
          title={`Delete “${current.name}”?`}
          body="The dish and its media come off your menu permanently."
          confirmLabel="Delete dish"
          danger
          busy={confirmBusy}
          onConfirm={deleteDish}
          onCancel={() => setDeleting(false)}
        />
      )}

      {modifierModal && (
        <ModifierModal
          itemId={current?.id}
          group={modifierModal.group}
          draft={modifierModal.draftIndex !== undefined ? draftGroups[modifierModal.draftIndex] : undefined}
          onStage={(g) =>
            setDraftGroups((prev) =>
              modifierModal.draftIndex !== undefined
                ? prev.map((p, i) => (i === modifierModal.draftIndex ? g : p))
                : [...prev, g]
            )
          }
          onRemoveDraft={
            modifierModal.draftIndex !== undefined
              ? () => setDraftGroups((prev) => prev.filter((_, i) => i !== modifierModal.draftIndex))
              : undefined
          }
          onClose={() => setModifierModal(null)}
          onChanged={async () => {
            await refreshItem();
            await onChanged();
          }}
        />
      )}
    </Modal>
  );
}

/* ---------- Media tile (module scope so React never remounts it mid-upload) ---------- */

function MediaTile({
  kind,
  url,
  hint,
  uploading,
  onPick,
  onRemove,
}: {
  kind: "photo" | "video" | "story";
  url: string;
  hint: string;
  uploading: "" | "photo" | "video" | "story";
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-navy-700 bg-navy-800">
      {url ? (
        <>
          {kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={url} muted playsInline controls className="h-full w-full object-cover" preload="metadata" />
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white"
            style={{ background: "rgba(10,10,12,0.72)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={uploading !== ""}
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-faint hover:text-ink-dim disabled:opacity-60"
        >
          {uploading === kind ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-700 border-t-accent" />
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-xs font-semibold">{hint}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ---------- Option-group editor ---------- */

function ModifierModal({
  itemId,
  group,
  draft,
  onStage,
  onRemoveDraft,
  onClose,
  onChanged,
}: {
  /** Undefined while the dish is unsaved — the group is staged instead of POSTed. */
  itemId?: string;
  group?: ModifierGroup;
  draft?: DraftGroup;
  onStage: (g: DraftGroup) => void;
  onRemoveDraft?: () => void;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const existing = group ?? draft;
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(existing?.type ?? "single");
  const [required, setRequired] = useState(existing?.required ?? false);
  const [options, setOptions] = useState<{ name: string; priceDelta: string }[]>(
    existing?.options.map((o) => ({ name: o.name, priceDelta: String(o.priceDelta) })) ?? [
      { name: "", priceDelta: "0" },
      { name: "", priceDelta: "0" },
    ]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const clean = options
      .filter((o) => o.name.trim())
      .map((o) => ({ name: o.name.trim(), priceDelta: Number(o.priceDelta) || 0 }));
    if (clean.length === 0) {
      setError("Add at least one option.");
      return;
    }
    setBusy(true);
    try {
      const body = { name: name.trim(), type, required, options: clean };
      if (!itemId) {
        // Dish isn't saved yet — hold the group and let "Add dish" persist it.
        onStage(body);
        onClose();
        return;
      }
      if (group) await api.updateModifierGroup(group.id, body);
      else await api.createModifierGroup(itemId, body);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the options.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!group) return;
    setBusy(true);
    try {
      await api.deleteModifierGroup(group.id);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the group.");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Modal title={group ? "Edit option group" : "New option group"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Group name">
          <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Size, Toppings, Spice level" className={inputCls} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setType(type === "single" ? "multi" : "single")}
            className="rounded-full border border-navy-700 px-4 py-2 text-xs font-bold text-ink-dim"
          >
            {type === "single" ? "Customers pick one" : "Customers pick any"} — tap to switch
          </button>
          <button
            type="button"
            onClick={() => setRequired(!required)}
            aria-pressed={required}
            className="rounded-full border px-4 py-2 text-xs font-bold"
            style={required ? { borderColor: "var(--accent)", color: "var(--accent)" } : { borderColor: "var(--navy-700)", color: "var(--ink-dim)" }}
          >
            {required ? "✓ Required" : "Optional"}
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Choices</p>
          <div className="mt-2 space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={o.name}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder={`Option ${i + 1}`}
                  className={inputCls}
                />
                <input
                  value={o.priceDelta}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, priceDelta: e.target.value } : x)))}
                  placeholder="+0"
                  inputMode="decimal"
                  className={`${inputCls} w-24 shrink-0`}
                />
                <button
                  type="button"
                  aria-label="Remove option"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-xl border border-navy-700 px-3 text-ink-faint hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOptions([...options, { name: "", priceDelta: "0" }])}
            className="mt-2 text-xs font-bold text-accent"
          >
            + Add choice
          </button>
        </div>

        <ErrorNote message={error} />

        <div className="flex items-center justify-between gap-3 pt-2">
          {group ? (
            <Btn variant="danger" small onClick={() => setConfirmDelete(true)}>Delete group</Btn>
          ) : onRemoveDraft ? (
            // Staged group: nothing to delete server-side, just drop it.
            <Btn variant="danger" small onClick={() => { onRemoveDraft(); onClose(); }}>Remove group</Btn>
          ) : <span />}
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn type="submit" loading={busy}>Save</Btn>
          </div>
        </div>
      </form>

      {confirmDelete && group && (
        <Confirm
          title={`Delete “${group.name}”?`}
          body="Customers will no longer see these choices on the dish."
          confirmLabel="Delete group"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
