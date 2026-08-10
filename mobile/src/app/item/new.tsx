import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ModifierGroupInput } from "@/lib/api";
import { useKeyboardPadding } from "@/lib/keyboard";
import { Button } from "@/components/ui";
import { DishForm, draftFromItem, parseDraft, DishDraft } from "@/components/dish-form";
import { ModifierEditor } from "@/components/modifier-editor";
import { currencySymbol } from "@/lib/currencies";
import { colors } from "@/lib/theme";

export default function NewDish() {
  const { restaurantId, categoryId, currency } = useLocalSearchParams<{
    restaurantId: string;
    categoryId: string;
    currency?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<DishDraft>(draftFromItem());
  const [saving, setSaving] = useState(false);
  // Option groups queued before the dish exists; written right after it's created.
  const [stagedGroups, setStagedGroups] = useState<ModifierGroupInput[]>([]);
  const keyboardPad = useKeyboardPadding();

  const onChange = (patch: Partial<DishDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    const parsed = parseDraft(draft);
    if (parsed.error) {
      Alert.alert("Almost there", parsed.error);
      return;
    }
    setSaving(true);
    try {
      const { item } = await api.createItem(restaurantId, {
        categoryId,
        name: draft.name.trim(),
        caption: draft.caption,
        description: draft.description,
        price: parsed.price!,
        imageUrl: draft.imageUrl,
        videoUrl: draft.videoUrl,
        isVegetarian: draft.isVegetarian,
        isSpicy: draft.isSpicy,
        isAvailable: draft.isAvailable,
      });
      // Groups need the dish's id, so they're written now. A failure here must
      // not look like the whole save failed — the dish exists either way, so
      // say what didn't land and still move on to the editor, where the owner
      // can re-add it.
      const failed: string[] = [];
      for (const group of stagedGroups) {
        try {
          await api.createModifierGroup(item.id, group);
        } catch {
          failed.push(group.name);
        }
      }
      if (failed.length > 0) {
        Alert.alert(
          "Dish saved, options didn't",
          `Couldn't save: ${failed.join(", ")}. Add them again from the dish editor.`
        );
      }
      // Jump straight into the editor so the owner can start 3D generation
      router.replace(`/item/${item.id}`);
    } catch (err) {
      Alert.alert("Could not save dish", err instanceof Error ? err.message : "Try again");
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 + keyboardPad }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <DishForm draft={draft} onChange={onChange} currency={currency} />
      <ModifierEditor
        groups={[]}
        staged={stagedGroups}
        onStagedChange={setStagedGroups}
        currencySymbol={currencySymbol(currency)}
        onChanged={() => {}}
      />
      <Button
        title="Save dish"
        icon="check"
        onPress={save}
        loading={saving}
        style={{ marginTop: 22 }}
      />
    </ScrollView>
  );
}
