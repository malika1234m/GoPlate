import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { api, mediaUrl, API_URL, RestaurantFull, MenuItem } from "@/lib/api";
import { localToday } from "@/lib/upgrade";
import { useKeyboardPadding } from "@/lib/keyboard";
import { formatPrice } from "@/lib/currencies";
import { Badge, BadgeTone, Button, Card, EmptyState, Icon, IconCircle, Chip, Input } from "@/components/ui";
import { colors, font, GlyphName, radius } from "@/lib/theme";

function statusBadge(item: MenuItem): { text: string; tone: BadgeTone } {
  if (item.soldOutDate === localToday()) return { text: "SOLD OUT TODAY", tone: "danger" };
  if (item.modelStatus === "READY") return { text: "3D READY", tone: "success" };
  if (item.modelStatus === "PROCESSING") return { text: "3D BUILDING…", tone: "accent" };
  if (item.modelStatus === "FAILED") return { text: "3D FAILED", tone: "danger" };
  if (item.videoUrl) return { text: "360° VIDEO", tone: "sky" };
  if (item.storyVideoUrl) return { text: "VIDEO", tone: "sky" };
  if (item.imageUrl) return { text: "PHOTO", tone: "neutral" };
  return { text: "NO MEDIA", tone: "danger" };
}

const SCHEDULE_PRESETS: [string, string, string][] = [
  ["All day", "", ""],
  ["Breakfast", "06:00", "11:00"],
  ["Lunch", "11:00", "16:00"],
  ["Dinner", "16:00", "23:00"],
];

const ACTIONS: { label: string; icon: GlyphName; to: "orders" | "qr" | "preview" | "settings" }[] = [
  { label: "Orders", icon: "receipt", to: "orders" },
  { label: "QR code", icon: "qr_code", to: "qr" },
  { label: "Preview", icon: "visibility", to: "preview" },
  { label: "Settings", icon: "settings", to: "settings" },
];

export default function MenuEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurant, setRestaurant] = useState<RestaurantFull | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const keyboardPad = useKeyboardPadding();
  const [renaming, setRenaming] = useState<{
    id: string;
    name: string;
    availableFrom: string;
    availableTo: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const { restaurant } = await api.getRestaurant(id);
      setRestaurant(restaurant);
    } catch (err) {
      Alert.alert("Could not load menu", err instanceof Error ? err.message : "Try again");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /**
   * Pull-to-refresh drives its own flag. Reusing `loading` here would flash the
   * spinner on every return from the dish editor, since this screen reloads on
   * focus.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setAddingCategory(true);
    try {
      await api.createCategory(id, newCategory.trim());
      setNewCategory("");
      await load();
    } catch (err) {
      Alert.alert("Could not add category", err instanceof Error ? err.message : "Try again");
    } finally {
      setAddingCategory(false);
    }
  };

  const saveCategory = async () => {
    if (!renaming || !renaming.name.trim()) return;
    const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
    const { availableFrom, availableTo } = renaming;
    const scheduled = availableFrom || availableTo;
    if (scheduled && (!TIME.test(availableFrom) || !TIME.test(availableTo))) {
      Alert.alert("Check the times", "Use 24h HH:MM format, e.g. 11:00 to 16:00 — or pick a preset.");
      return;
    }
    try {
      await api.updateCategory(renaming.id, {
        name: renaming.name.trim(),
        availableFrom,
        availableTo,
      });
      setRenaming(null);
      load();
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again");
    }
  };

  const toggleSoldOut = async (item: MenuItem) => {
    const soldOut = item.soldOutDate === localToday();
    // Flip the pill immediately — a full menu reload takes long enough that the
    // tap feels ignored otherwise. The reload below reconciles with the server.
    const optimistic = soldOut ? "" : localToday();
    setRestaurant((r) =>
      r
        ? {
            ...r,
            categories: r.categories.map((c) => ({
              ...c,
              items: c.items.map((i) =>
                i.id === item.id ? { ...i, soldOutDate: optimistic } : i
              ),
            })),
          }
        : r
    );
    try {
      await api.updateItem(item.id, { soldOutToday: !soldOut });
    } catch (err) {
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
    }
    load();
  };

  const removeCategory = (categoryId: string, name: string) => {
    Alert.alert("Delete category", `Delete “${name}” and all dishes in it?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteCategory(categoryId);
          } catch (err) {
            Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
          }
          load();
        },
      },
    ]);
  };

  if (!restaurant)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );

  const onAction = (to: "orders" | "qr" | "preview" | "settings") => {
    if (to === "orders") router.push(`/restaurant/${id}/orders`);
    if (to === "qr") router.push(`/restaurant/${id}/qr`);
    if (to === "preview") WebBrowser.openBrowserAsync(`${API_URL}/r/${restaurant.slug}`);
    if (to === "settings") router.push(`/restaurant/${id}/settings`);
  };

  return (
    <>
      <Stack.Screen options={{ title: restaurant.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 48 + keyboardPad,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick actions */}
        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <Pressable key={a.to} style={{ flex: 1 }} onPress={() => onAction(a.to)}>
              {({ pressed }) => (
                <Card style={[styles.actionTile, pressed && { borderColor: colors.borderLight }]}>
                  <IconCircle name={a.icon} size={40} />
                  <Text style={styles.actionLabel} allowFontScaling={false}>
                    {a.label}
                  </Text>
                </Card>
              )}
            </Pressable>
          ))}
        </View>

        {restaurant.categories.length === 0 && (
          <EmptyState
            icon="restaurant_menu"
            title="Build your menu"
            body="Start by adding a category — Starters, Mains, Desserts — then add dishes with photos and videos."
          />
        )}

        {restaurant.categories.map((cat) => (
          <View key={cat.id} style={{ marginBottom: 26 }}>
            <View style={styles.catHeader}>
              <View style={styles.catTitleWrap}>
                <View style={styles.catTick} />
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCount}>{cat.items.length}</Text>
                {cat.availableFrom && cat.availableTo ? (
                  <View style={styles.timeChip}>
                    <Icon name="schedule" size={12} color={colors.sky} />
                    <Text style={styles.timeChipText} allowFontScaling={false}>
                      {cat.availableFrom}–{cat.availableTo}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  onPress={() =>
                    setRenaming({
                      id: cat.id,
                      name: cat.name,
                      availableFrom: cat.availableFrom ?? "",
                      availableTo: cat.availableTo ?? "",
                    })
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit category ${cat.name}`}
                  style={styles.iconBtn}
                >
                  <Icon name="edit" size={16} color={colors.textDim} />
                </Pressable>
                <Pressable
                  onPress={() => removeCategory(cat.id, cat.name)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete category ${cat.name}`}
                  style={styles.iconBtn}
                >
                  <Icon name="delete" size={16} color={colors.textFaint} />
                </Pressable>
              </View>
            </View>

            {cat.items.map((item) => {
              const status = statusBadge(item);
              const soldOut = item.soldOutDate === localToday();
              return (
                <Pressable key={item.id} onPress={() => router.push(`/item/${item.id}`)}>
                  {({ pressed }) => (
                    <Card
                      style={[styles.itemCard, pressed && { borderColor: colors.borderLight }]}
                    >
                      <View style={styles.thumb}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: mediaUrl(item.imageUrl) }}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <Icon name="image" size={22} color={colors.textFaint} />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                          {!item.isAvailable && (
                            <Text style={{ color: colors.textFaint }}>  (hidden)</Text>
                          )}
                        </Text>
                        <Badge label={status.text} tone={status.tone} />
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 8 }}>
                        <Text style={styles.price} allowFontScaling={false}>
                          {formatPrice(item.price, restaurant.currency)}
                        </Text>
                        <Pressable
                          onPress={() => toggleSoldOut(item)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityState={{ selected: soldOut }}
                          accessibilityLabel={
                            soldOut
                              ? `${item.name} is sold out today. Tap to put it back on the menu.`
                              : `Mark ${item.name} sold out for today`
                          }
                          style={[styles.soldOutPill, soldOut && styles.soldOutPillActive]}
                        >
                          <Text
                            style={[styles.soldOutText, soldOut && { color: "#fff" }]}
                            allowFontScaling={false}
                          >
                            {soldOut ? "Sold out" : "In stock"}
                          </Text>
                        </Pressable>
                      </View>
                    </Card>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/item/new",
                  params: { restaurantId: id, categoryId: cat.id, currency: restaurant.currency },
                })
              }
            >
              {({ pressed }) => (
                <View style={[styles.addDish, pressed && { borderColor: colors.accent }]}>
                  <Icon name="add" size={18} color={colors.accent} />
                  <Text style={styles.addDishText} allowFontScaling={false}>
                    Add dish to {cat.name}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        ))}

        {/* Add category */}
        <Card style={{ padding: 18 }}>
          <Input
            label="New category"
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="e.g. Starters"
          />
          <Button
            title="Add category"
            icon="add"
            variant="secondary"
            onPress={addCategory}
            loading={addingCategory}
          />
        </Card>
      </ScrollView>

      {/* Edit category: name + serving window. A real Modal so the Android
          back button and a tap outside both close it. */}
      <Modal
        visible={!!renaming}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRenaming(null)}
      >
        {renaming && (
        <View style={[styles.overlay, { paddingBottom: 24 + keyboardPad }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRenaming(null)} />
          <Card style={{ width: "100%", padding: 18 }}>
            <Input
              label="Category name"
              value={renaming.name}
              onChangeText={(v) => setRenaming({ ...renaming, name: v })}
              autoFocus
            />
            <Text style={styles.scheduleLabel}>Served during</Text>
            <View style={styles.presetRow}>
              {SCHEDULE_PRESETS.map(([label, from, to]) => (
                <Chip
                  key={label}
                  label={label}
                  active={renaming.availableFrom === from && renaming.availableTo === to}
                  onPress={() => setRenaming({ ...renaming, availableFrom: from, availableTo: to })}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="From"
                  value={renaming.availableFrom}
                  onChangeText={(v) => setRenaming({ ...renaming, availableFrom: v })}
                  placeholder="11:00"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="To"
                  value={renaming.availableTo}
                  onChangeText={(v) => setRenaming({ ...renaming, availableTo: v })}
                  placeholder="16:00"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="Cancel"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={() => setRenaming(null)}
              />
              <Button title="Save" style={{ flex: 1 }} onPress={saveCategory} />
            </View>
          </Card>
        </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginBottom: 24 },
  actionTile: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
  },
  actionLabel: { color: colors.textDim, fontSize: 12.5, fontFamily: font.semibold },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  catTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  catTick: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.accent },
  catName: { color: colors.text, fontSize: 19, fontFamily: font.heavy },
  catCount: {
    color: colors.textFaint,
    fontSize: 12,
    fontFamily: font.bold,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.skySoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeChipText: { color: colors.sky, fontSize: 11, fontFamily: font.bold },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    marginBottom: 8,
    borderRadius: radius.lg,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemName: { color: colors.text, fontSize: 15, fontFamily: font.semibold },
  price: { color: colors.accent, fontFamily: font.bold, fontSize: 15 },
  addDish: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    paddingVertical: 12,
    marginTop: 2,
  },
  addDishText: { color: colors.accent, fontSize: 13.5, fontFamily: font.semibold },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(4,4,5,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  soldOutPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  soldOutPillActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  soldOutText: { fontSize: 11.5, fontFamily: font.bold, color: colors.textFaint },
  scheduleLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: font.semibold,
    marginBottom: 8,
  },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
});
