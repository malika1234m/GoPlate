import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useKeyboardPadding } from "@/lib/keyboard";
import { Button } from "@/components/ui";
import { DishForm, draftFromItem, parseDraft, DishDraft } from "@/components/dish-form";
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
