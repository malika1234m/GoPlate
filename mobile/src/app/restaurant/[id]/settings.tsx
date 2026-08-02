import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, mediaUrl, API_URL, RestaurantFull } from "@/lib/api";
import { Button, Card, Chip, Icon, Input, SectionHeader, Select } from "@/components/ui";
import { captureMedia, chooseSource } from "@/components/dish-form";
import { useKeyboardPadding } from "@/lib/keyboard";
import { currencyOptions } from "@/lib/currencies";
import { colors, font, radius } from "@/lib/theme";

const ACCENT_PRESETS = [
  "#f0762e",
  "#e8a02a",
  "#3fa9e0",
  "#7bb26a",
  "#c23a5a",
  "#8a5cd6",
  "#2aa89a",
  "#e85d2a",
];

const THEMES = [
  ["midnight", "Midnight", "#0b0d16"],
  ["espresso", "Espresso", "#14100c"],
  ["ivory", "Ivory", "#f3efe7"],
] as const;

export default function Settings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantFull | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState<"logo" | "cover" | null>(null);
  const keyboardPad = useKeyboardPadding();

  useEffect(() => {
    api
      .getRestaurant(id)
      .then(({ restaurant }) => setRestaurant(restaurant))
      .catch(() => {
        Alert.alert("Could not load settings", "Check your connection and try again.");
        router.back();
      });
  }, [id, router]);

  if (!restaurant)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );

  const set = (patch: Partial<RestaurantFull>) =>
    setRestaurant((r) => (r ? { ...r, ...patch } : r));

  const save = async () => {
    if (!/^[A-Za-z]{3}$/.test(restaurant.currency.trim())) {
      Alert.alert("Pick a currency", "Choose the currency your prices are shown in.");
      return;
    }
    setSaving(true);
    try {
      await api.updateRestaurant(id, {
        name: restaurant.name,
        caption: restaurant.caption,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        currency: restaurant.currency,
        accentColor: restaurant.accentColor,
        logoUrl: restaurant.logoUrl,
        coverUrl: restaurant.coverUrl,
        theme: restaurant.theme,
        layout: restaurant.layout,
        showReel: restaurant.showReel,
        isPublished: restaurant.isPublished,
      });
      router.back();
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again");
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandImage = (kind: "logo" | "cover") =>
    chooseSource(async (source) => {
      const uri = await captureMedia("image", source);
      if (!uri) return;
      setUploadingBrand(kind);
      try {
        const { url } = await api.upload(uri, "image");
        set(kind === "logo" ? { logoUrl: url } : { coverUrl: url });
      } catch (err) {
        Alert.alert("Upload failed", err instanceof Error ? err.message : "Try again");
      } finally {
        setUploadingBrand(null);
      }
    });

  const preview = () => {
    WebBrowser.openBrowserAsync(`${API_URL}/r/${restaurant!.slug}`);
  };

  const remove = () => {
    Alert.alert(
      "Delete restaurant",
      `Permanently delete “${restaurant.name}” and its entire menu? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteRestaurant(id);
              router.dismissAll();
              router.replace("/restaurants");
            } catch (err) {
              Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 + keyboardPad }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeader title="Basics" />
      <Card style={{ padding: 18 }}>
        <Input label="Name" value={restaurant.name} onChangeText={(v) => set({ name: v })} />
        <Input
          label="Caption"
          value={restaurant.caption}
          onChangeText={(v) => set({ caption: v })}
          placeholder="e.g. Plates worth turning around"
          hint="Shown under your name at the top of the menu."
        />
        <Input
          label="Description"
          value={restaurant.description}
          onChangeText={(v) => set({ description: v })}
          multiline
        />
        <Input label="Address" value={restaurant.address} onChangeText={(v) => set({ address: v })} />
        <Input
          label="Phone"
          value={restaurant.phone}
          onChangeText={(v) => set({ phone: v })}
          keyboardType="phone-pad"
        />
        <Select
          label="Currency"
          title="Choose your currency"
          value={restaurant.currency}
          onChange={(v) => set({ currency: v })}
          options={currencyOptions(restaurant.currency)}
          searchable
          searchPlaceholder="Search currency or code"
          hint="Shown next to every price on your menu."
        />
      </Card>

      <SectionHeader
        title="Brand"
        hint="The logo appears above your name on the menu; the cover photo sits behind the header."
      />
      <View style={styles.brandRow}>
        <Pressable style={styles.brandBox} onPress={() => uploadBrandImage("logo")}>
          {restaurant.logoUrl ? (
            <Image source={{ uri: mediaUrl(restaurant.logoUrl) }} style={styles.brandFill} />
          ) : (
            <View style={styles.brandInner}>
              <Icon name="image" size={22} color={colors.accent} />
              <Text style={styles.brandHint} allowFontScaling={false}>
                {uploadingBrand === "logo" ? "Uploading…" : "Logo"}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable style={[styles.brandBox, { flex: 2 }]} onPress={() => uploadBrandImage("cover")}>
          {restaurant.coverUrl ? (
            <Image source={{ uri: mediaUrl(restaurant.coverUrl) }} style={styles.brandFill} />
          ) : (
            <View style={styles.brandInner}>
              <Icon name="photo_camera" size={22} color={colors.sky} />
              <Text style={styles.brandHint} allowFontScaling={false}>
                {uploadingBrand === "cover" ? "Uploading…" : "Cover photo"}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <SectionHeader title="How customers see your menu" />
      <Card style={{ padding: 18 }}>
        <Text style={styles.pickerLabel}>Theme</Text>
        <View style={styles.chipRow}>
          {THEMES.map(([value, label, swatch]) => (
            <Chip
              key={value}
              label={label}
              swatch={swatch}
              active={restaurant.theme === value}
              onPress={() => set({ theme: value })}
            />
          ))}
        </View>

        <Text style={[styles.pickerLabel, { marginTop: 18 }]}>Dish layout</Text>
        <View style={styles.chipRow}>
          <Chip
            label="List"
            active={restaurant.layout === "list"}
            onPress={() => set({ layout: "list" })}
          />
          <Chip
            label="Photo grid"
            active={restaurant.layout === "grid"}
            onPress={() => set({ layout: "grid" })}
          />
        </View>

        <Text style={[styles.pickerLabel, { marginTop: 18 }]}>Accent color</Text>
        <View style={[styles.chipRow, { flexWrap: "wrap" }]}>
          {ACCENT_PRESETS.map((hex) => {
            const active = restaurant.accentColor.toLowerCase() === hex;
            return (
              <Pressable
                key={hex}
                onPress={() => set({ accentColor: hex })}
                accessibilityLabel={`Accent color ${hex}`}
                style={[styles.swatch, { backgroundColor: hex }, active && styles.swatchActive]}
              >
                {active ? <Icon name="check" size={18} color="#fff" /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.switchRow, { marginTop: 18 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>“From our kitchen” reel</Text>
            <Text style={styles.switchHint}>
              A strip of your dish videos at the top of the menu.
            </Text>
          </View>
          <Switch
            value={restaurant.showReel}
            onValueChange={(v) => set({ showReel: v })}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.text}
          />
        </View>
      </Card>

      <SectionHeader title="Visibility" />
      <Card style={[styles.switchRow, { padding: 18 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Menu is live</Text>
          <Text style={styles.switchHint}>
            When off, customers scanning your QR code see nothing.
          </Text>
        </View>
        <Switch
          value={restaurant.isPublished}
          onValueChange={(v) => set({ isPublished: v })}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.text}
        />
      </Card>

      <Button title="Save changes" icon="check" onPress={save} loading={saving} style={{ marginTop: 24 }} />
      <Button title="Preview menu" icon="visibility" variant="secondary" onPress={preview} style={{ marginTop: 10 }} />

      <SectionHeader title="Danger zone" />
      <Card style={{ borderColor: "rgba(224,82,63,0.35)", padding: 18 }}>
        <Text style={styles.dangerText}>
          Deleting removes the restaurant, its menu, and all media permanently.
        </Text>
        <Button title="Delete restaurant" icon="delete" variant="danger" onPress={remove} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pickerLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: font.semibold,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: { borderColor: colors.text },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchTitle: { color: colors.text, fontFamily: font.bold, fontSize: 15 },
  switchHint: {
    color: colors.textFaint,
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
    fontFamily: font.regular,
  },
  brandRow: { flexDirection: "row", gap: 10 },
  brandBox: {
    flex: 1,
    height: 96,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandInner: { alignItems: "center", gap: 5 },
  brandFill: { width: "100%", height: "100%" },
  brandHint: {
    color: colors.textDim,
    textAlign: "center",
    fontSize: 12.5,
    fontFamily: font.medium,
  },
  dangerText: {
    color: colors.textFaint,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontFamily: font.regular,
  },
});
