import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { api, ModifierGroup, ModifierGroupInput } from "@/lib/api";
import { Button, Card, Chip, Icon, Input } from "@/components/ui";
import { colors, font } from "@/lib/theme";

type DraftOption = { name: string; priceDelta: string };
type Draft = {
  id?: string;
  name: string;
  type: "single" | "multi";
  required: boolean;
  options: DraftOption[];
};

function emptyDraft(): Draft {
  return { name: "", type: "single", required: false, options: [{ name: "", priceDelta: "" }] };
}

function draftFromGroup(g: ModifierGroup): Draft {
  return {
    id: g.id,
    name: g.name,
    type: g.type,
    required: g.required,
    options: g.options.map((o) => ({ name: o.name, priceDelta: o.priceDelta ? String(o.priceDelta) : "" })),
  };
}

function toInput(d: Draft): ModifierGroupInput | string {
  if (!d.name.trim()) return "Give the option group a name (e.g. Size).";
  const options = d.options
    .filter((o) => o.name.trim())
    .map((o) => ({ name: o.name.trim(), priceDelta: Number(o.priceDelta.replace(",", ".")) || 0 }));
  if (options.length === 0) return "Add at least one option.";
  return { name: d.name.trim(), type: d.type, required: d.required, options };
}

/**
 * "Options & add-ons" editor: sizes, toppings, spice levels with price deltas.
 *
 * On a dish that doesn't exist yet `itemId` is undefined: groups can't be POSTed
 * (the API keys them to an item id), so they're handed back through
 * `onStagedChange` and written by the caller once the dish has been created.
 */
export function ModifierEditor({
  itemId,
  groups,
  staged = [],
  onStagedChange,
  currencySymbol,
  onChanged,
}: {
  itemId?: string;
  groups: ModifierGroup[];
  staged?: ModifierGroupInput[];
  onStagedChange?: (groups: ModifierGroupInput[]) => void;
  currencySymbol: string;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  // Index of the staged group being edited, or null when adding a new one.
  const [stagedIndex, setStagedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft) return;
    const input = toInput(draft);
    if (typeof input === "string") {
      Alert.alert("Almost there", input);
      return;
    }
    if (!itemId) {
      onStagedChange?.(
        stagedIndex === null
          ? [...staged, input]
          : staged.map((g, i) => (i === stagedIndex ? input : g))
      );
      setDraft(null);
      setStagedIndex(null);
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await api.updateModifierGroup(draft.id, input);
      else await api.createModifierGroup(itemId, input);
      setDraft(null);
      onChanged();
    } catch (err) {
      Alert.alert("Could not save options", err instanceof Error ? err.message : "Try again");
    } finally {
      setSaving(false);
    }
  };

  const remove = (g: ModifierGroup) => {
    Alert.alert("Delete option group", `Remove “${g.name}” and its choices?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteModifierGroup(g.id);
          } catch (err) {
            Alert.alert(
              "Could not delete",
              err instanceof Error ? err.message : "Check your connection and try again."
            );
          }
          onChanged();
        },
      },
    ]);
  };

  /** Staged groups exist only on this screen — nothing to delete server-side. */
  const removeStaged = (index: number) => {
    Alert.alert("Remove option group", `Remove “${staged[index].name}” and its choices?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          onStagedChange?.(staged.filter((_, i) => i !== index));
          if (stagedIndex === index) {
            setDraft(null);
            setStagedIndex(null);
          }
        },
      },
    ]);
  };

  return (
    <Card style={{ marginTop: 16, padding: 16 }}>
      <Text style={styles.title}>Options & add-ons</Text>
      <Text style={styles.hint}>
        Sizes, toppings, spice levels — customers pick these on the menu and see the price update.
      </Text>

      {groups.map((g) => (
        <View key={g.id} style={styles.groupRow}>
          <Pressable style={{ flex: 1 }} onPress={() => setDraft(draftFromGroup(g))}>
            <Text style={styles.groupName}>
              {g.name}{" "}
              <Text style={styles.groupMeta}>
                · {g.type === "single" ? "pick one" : "pick any"}
                {g.required ? " · required" : ""}
              </Text>
            </Text>
            <Text style={styles.groupOptions} numberOfLines={1}>
              {g.options
                .map((o) => (o.priceDelta ? `${o.name} +${currencySymbol}${o.priceDelta}` : o.name))
                .join(", ")}
            </Text>
          </Pressable>
          <Pressable onPress={() => remove(g)} hitSlop={8} style={styles.deleteBtn}>
            <Icon name="delete" size={16} color={colors.danger} />
          </Pressable>
        </View>
      ))}

      {/* Groups queued on an unsaved dish — written as soon as it's created. */}
      {staged.map((g, i) => (
        <View key={`staged-${i}`} style={styles.groupRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              setStagedIndex(i);
              setDraft({
                name: g.name,
                type: g.type,
                required: g.required,
                options: g.options.map((o) => ({
                  name: o.name,
                  priceDelta: o.priceDelta ? String(o.priceDelta) : "",
                })),
              });
            }}
          >
            <Text style={styles.groupName}>
              {g.name}{" "}
              <Text style={styles.groupMeta}>
                · {g.type === "single" ? "pick one" : "pick any"}
                {g.required ? " · required" : ""}
              </Text>
            </Text>
            <Text style={styles.groupOptions} numberOfLines={1}>
              {g.options
                .map((o) => (o.priceDelta ? `${o.name} +${currencySymbol}${o.priceDelta}` : o.name))
                .join(", ")}
            </Text>
          </Pressable>
          <Pressable onPress={() => removeStaged(i)} hitSlop={8} style={styles.deleteBtn}>
            <Icon name="delete" size={16} color={colors.danger} />
          </Pressable>
        </View>
      ))}

      {draft ? (
        <View style={styles.editor}>
          <Input
            label="Group name"
            value={draft.name}
            onChangeText={(v) => setDraft({ ...draft, name: v })}
            placeholder="e.g. Size, Toppings, Spice level"
          />

          <View style={styles.chipRow}>
            <Chip
              label="Pick one"
              active={draft.type === "single"}
              onPress={() => setDraft({ ...draft, type: "single" })}
            />
            <Chip
              label="Pick any"
              active={draft.type === "multi"}
              onPress={() => setDraft({ ...draft, type: "multi" })}
            />
            <View style={styles.requiredRow}>
              <Text style={styles.requiredLabel}>Required</Text>
              <Switch
                value={draft.required}
                onValueChange={(v) => setDraft({ ...draft, required: v })}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.text}
              />
            </View>
          </View>

          {draft.options.map((opt, i) => (
            <View key={i} style={styles.optionRow}>
              <View style={{ flex: 2 }}>
                <Input
                  value={opt.name}
                  onChangeText={(v) => {
                    const options = [...draft.options];
                    options[i] = { ...opt, name: v };
                    setDraft({ ...draft, options });
                  }}
                  placeholder={`Option ${i + 1}`}
                  style={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  value={opt.priceDelta}
                  onChangeText={(v) => {
                    const options = [...draft.options];
                    options[i] = { ...opt, priceDelta: v };
                    setDraft({ ...draft, options });
                  }}
                  placeholder={`+${currencySymbol}0`}
                  keyboardType="decimal-pad"
                />
              </View>
              <Pressable
                onPress={() =>
                  setDraft({ ...draft, options: draft.options.filter((_, j) => j !== i) })
                }
                hitSlop={8}
                style={{ paddingBottom: 14 }}
              >
                <Icon name="close" size={18} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() =>
              setDraft({ ...draft, options: [...draft.options, { name: "", priceDelta: "" }] })
            }
            style={styles.addOption}
          >
            <Icon name="add" size={16} color={colors.accent} />
            <Text style={styles.addOptionText}>Add option</Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              title="Cancel"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => {
                setDraft(null);
                setStagedIndex(null);
              }}
            />
            <Button title="Save options" style={{ flex: 1 }} onPress={save} loading={saving} />
          </View>
        </View>
      ) : (
        <Button
          title="Add option group"
          icon="add"
          variant="secondary"
          onPress={() => {
            setStagedIndex(null);
            setDraft(emptyDraft());
          }}
          style={{ marginTop: 10 }}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 15.5, fontFamily: font.bold },
  hint: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 18,
    fontFamily: font.regular,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  groupName: { color: colors.text, fontFamily: font.bold, fontSize: 14.5 },
  groupMeta: { color: colors.textFaint, fontFamily: font.regular, fontSize: 12 },
  groupOptions: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 2,
    fontFamily: font.regular,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  editor: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  requiredRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  requiredLabel: { color: colors.textDim, fontSize: 13, fontFamily: font.medium },
  optionRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  addOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
    paddingVertical: 4,
  },
  addOptionText: { color: colors.accent, fontFamily: font.semibold, fontSize: 13.5 },
});
