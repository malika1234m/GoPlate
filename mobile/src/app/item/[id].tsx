import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, MenuItem } from "@/lib/api";
import { handleUpgradeError } from "@/lib/upgrade";
import { currencySymbol } from "@/lib/currencies";
import { useKeyboardPadding } from "@/lib/keyboard";
import { Badge, BadgeTone, Button, Card, IconCircle } from "@/components/ui";
import { ModifierEditor } from "@/components/modifier-editor";
import {
  captureMedia,
  chooseSource,
  DishForm,
  draftFromItem,
  parseDraft,
  DishDraft,
} from "@/components/dish-form";
import { colors, font } from "@/lib/theme";

function modelBadge(status: MenuItem["modelStatus"]): { label: string; tone: BadgeTone } {
  if (status === "READY") return { label: "LIVE ON MENU", tone: "success" };
  if (status === "PROCESSING") return { label: "BUILDING…", tone: "accent" };
  if (status === "FAILED") return { label: "FAILED", tone: "danger" };
  return { label: "NOT GENERATED", tone: "neutral" };
}

export default function EditDish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [draft, setDraft] = useState<DishDraft | null>(null);
  // Held separately: only the initial GET carries the restaurant, so reading it
  // off `item` would blank out after any PATCH response replaces it.
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyboardPad = useKeyboardPadding();
  const insets = useSafeAreaInsets();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.check3d(id);
        setItem(res.item);
        setProgress(res.progress ?? null);
        if (res.item.modelStatus !== "PROCESSING") {
          stopPolling();
          setProgress(null);
          if (res.item.modelStatus === "READY") {
            Alert.alert("3D model ready", "Customers can now spin this dish on your menu.");
          } else if (res.item.modelStatus === "FAILED") {
            Alert.alert("3D generation failed", res.error ?? "Try again with a clearer photo.");
          }
        }
      } catch {
        // Transient network error — keep polling
      }
    }, 5000);
  }, [id, stopPolling]);

  useEffect(() => {
    api
      .getItem(id)
      .then(({ item }) => {
        setItem(item);
        setDraft(draftFromItem(item));
        setCurrency(item.restaurant?.currency);
        if (item.modelStatus === "PROCESSING") startPolling();
      })
      .catch(() => {
        Alert.alert("Could not load dish", "Check your connection and try again.");
        router.back();
      });
    return stopPolling;
  }, [id, router, startPolling, stopPolling]);

  if (!item || !draft)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );

  const onChange = (patch: Partial<DishDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    const parsed = parseDraft(draft);
    if (parsed.error) {
      Alert.alert("Almost there", parsed.error);
      return;
    }
    setSaving(true);
    try {
      await api.updateItem(id, {
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
      router.back();
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again");
    } finally {
      setSaving(false);
    }
  };

  const generate3d = async () => {
    if (!draft.imageUrl) {
      Alert.alert("Photo needed", "Add a photo of the dish first — it is used to build the 3D model.");
      return;
    }
    setGenerating(true);
    try {
      // Persist any unsaved media before kicking off generation
      await api.updateItem(id, { imageUrl: draft.imageUrl, videoUrl: draft.videoUrl });
      const { item: updated } = await api.generate3d(id);
      setItem(updated);
      startPolling();
    } catch (err) {
      if (!handleUpgradeError(err)) {
        Alert.alert(
          "3D generation unavailable",
          err instanceof Error ? err.message : "Try again later"
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const reloadItem = () =>
    api
      .getItem(id)
      .then(({ item }) => setItem(item))
      .catch(() => {});

  const addStoryVideo = () => {
    if (uploadingStory) return;
    chooseSource(async (source) => {
      const uri = await captureMedia("video", source);
      if (!uri) return;
      setStoryProgress(0);
      setUploadingStory(true);
      try {
        const { item: updated } = await api.uploadStoryVideo(id, uri, setStoryProgress);
        setItem(updated);
        Alert.alert(
          "Video ready",
          "We auto-edited your clip — trimmed, sped up, and polished. It now plays on your menu."
        );
      } catch (err) {
        Alert.alert("Upload failed", err instanceof Error ? err.message : "Try again");
      } finally {
        setUploadingStory(false);
      }
    });
  };

  const remove3d = () => {
    Alert.alert(
      "Remove 3D model",
      "Customers will see the dish's video or photo instead. This frees a 3D slot on your plan.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { item: updated } = await api.delete3d(id);
              setItem(updated);
            } catch (err) {
              Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
            }
          },
        },
      ]
    );
  };

  const removeStoryVideo = async () => {
    try {
      const { item: updated } = await api.updateItem(id, { storyVideoUrl: "" });
      setItem(updated);
    } catch (err) {
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
    }
  };

  const remove = () => {
    Alert.alert("Delete dish", `Remove “${item.name}” from the menu permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteItem(id);
            router.back();
          } catch (err) {
            Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
          }
        },
      },
    ]);
  };

  const badge = modelBadge(item.modelStatus);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 + keyboardPad }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* 3D model */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <IconCircle name="view_in_ar" size={42} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.statusTitle}>3D model</Text>
            <Badge label={badge.label} tone={badge.tone} dot={item.modelStatus === "PROCESSING"} />
          </View>
        </View>
        <Text style={styles.statusBody}>
          {item.modelStatus === "READY" &&
            "Customers can spin, tilt, and place this dish on their table in AR."}
          {item.modelStatus === "PROCESSING" &&
            "We're turning your photo into a photoreal 3D model. This usually takes a few minutes."}
          {item.modelStatus === "FAILED" &&
            "The last attempt didn't work. Try again with a brighter, sharper photo."}
          {item.modelStatus === "NONE" &&
            (draft.videoUrl
              ? "The 360° video is shown on your menu. Generate a 3D model to top it."
              : "Add a photo, then generate a 3D model customers can spin around.")}
        </Text>
        {item.modelStatus === "PROCESSING" ? (
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.max(6, progress ?? 6)}%` }]}
            />
          </View>
        ) : (
          <>
            <Button
              title={item.modelStatus === "READY" ? "Regenerate 3D model" : "Generate 3D model"}
              icon="view_in_ar"
              variant="secondary"
              onPress={generate3d}
              loading={generating}
              style={{ marginTop: 14 }}
            />
            {item.modelStatus === "READY" && (
              <Button
                title="Remove 3D model"
                icon="delete"
                variant="danger"
                onPress={remove3d}
                style={{ marginTop: 8 }}
              />
            )}
          </>
        )}
      </Card>

      {/* "How it's made" video */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <IconCircle name="movie" size={42} color={colors.sky} background={colors.skySoft} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.statusTitle}>“How it&apos;s made” video</Text>
            <Badge
              label={item.storyVideoUrl ? "ON YOUR MENU" : "NOT ADDED"}
              tone={item.storyVideoUrl ? "success" : "neutral"}
            />
          </View>
        </View>
        <Text style={styles.statusBody}>
          Film the cooking freely — we auto-edit it into a short, menu-ready clip.
        </Text>
        <Button
          title={item.storyVideoUrl ? "Replace video" : "Film / choose video"}
          icon="videocam"
          variant="secondary"
          onPress={addStoryVideo}
          loading={uploadingStory}
          style={{ marginTop: 14 }}
        />
        {uploadingStory ? (
          <Text style={styles.uploadNote}>
            {storyProgress > 0 && storyProgress < 100
              ? `Sending your clip — ${storyProgress}%. Keep the app open.`
              : "Editing your video on our side. This can take a minute — keep the app open."}
          </Text>
        ) : null}
        {item.storyVideoUrl ? (
          <Button
            title="Remove video"
            icon="delete"
            variant="danger"
            onPress={removeStoryVideo}
            style={{ marginTop: 8 }}
          />
        ) : null}
      </Card>

      <DishForm
        draft={draft}
        onChange={onChange}
        currency={currency}
        onRemoveMedia={async (kind) => {
          try {
            const { item: updated } = await api.updateItem(
              id,
              kind === "image" ? { imageUrl: "" } : { videoUrl: "" }
            );
            setItem(updated);
            setDraft((d) => (d ? { ...d, [kind === "image" ? "imageUrl" : "videoUrl"]: "" } : d));
          } catch (err) {
            Alert.alert("Something went wrong", err instanceof Error ? err.message : "Check your connection and try again.");
          }
        }}
      />

      <ModifierEditor
        itemId={id}
        groups={item.modifierGroups ?? []}
        currencySymbol={currencySymbol(currency)}
        onChanged={reloadItem}
      />

      <Button title="Save changes" onPress={save} loading={saving} style={{ marginTop: 22 }} />
      <Button
        title="Delete dish"
        icon="delete"
        variant="danger"
        onPress={remove}
        style={{ marginTop: 10 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statusCard: { marginBottom: 16, padding: 16 },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusTitle: { color: colors.text, fontSize: 15.5, fontFamily: font.bold },
  statusBody: {
    color: colors.textFaint,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    fontFamily: font.regular,
  },
  uploadNote: {
    color: colors.textDim,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 10,
    textAlign: "center",
    fontFamily: font.medium,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: colors.accent },
});
