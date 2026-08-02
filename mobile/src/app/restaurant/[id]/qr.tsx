import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/lib/api";
import { Button, Icon } from "@/components/ui";
import { colors, font, radius } from "@/lib/theme";

export default function QrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [qr, setQr] = useState<{ menuUrl: string; qrDataUrl: string } | null>(null);
  const [error, setError] = useState("");

  // setState only runs inside the async callbacks (after the effect returns),
  // not synchronously during the effect — avoids cascading-render warnings.
  const load = useCallback(() => {
    api
      .getQr(id)
      .then((r) => {
        setQr(r);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load QR code"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const share = async () => {
    if (!qr) return;
    await Share.share({
      message: `View our menu in 3D: ${qr.menuUrl}`,
      url: qr.menuUrl,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      // The QR, its caption and both buttons overflow a short screen, so this
      // has to scroll or "Open menu" ends up under the navigation bar.
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
    >
      {error ? (
        <>
          <Text style={{ color: colors.danger, textAlign: "center", fontFamily: font.medium }}>
            {error}
          </Text>
          <Button title="Try again" variant="secondary" onPress={load} style={{ marginTop: 16 }} />
        </>
      ) : !qr ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : (
        <>
          <View style={styles.qrFrame}>
            <View style={styles.qrCard}>
              <Image source={{ uri: qr.qrDataUrl }} style={styles.qr} />
            </View>
          </View>

          <View style={styles.urlPill}>
            <Icon name="link" size={15} color={colors.accent} />
            <Text style={styles.url} numberOfLines={1}>
              {qr.menuUrl.replace(/^https?:\/\//, "")}
            </Text>
          </View>

          <Text style={styles.hint}>
            Print this code and place it on tables, the counter, or your window. Customers scan it
            with their phone camera — no app needed — and your 3D menu opens instantly.
          </Text>

          <Button title="Share menu link" icon="share" onPress={share} style={{ alignSelf: "stretch" }} />
          <Button
            title="Open menu"
            icon="visibility"
            variant="secondary"
            onPress={() => WebBrowser.openBrowserAsync(qr.menuUrl)}
            style={{ alignSelf: "stretch", marginTop: 10 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  qrFrame: {
    padding: 3,
    borderRadius: radius.xl + 3,
    backgroundColor: colors.accent,
  },
  qrCard: {
    padding: 18,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
  },
  qr: { width: 230, height: 230 },
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  url: { color: colors.text, fontSize: 13.5, fontFamily: font.semibold },
  hint: {
    color: colors.textFaint,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 28,
    lineHeight: 20,
    fontSize: 13.5,
    fontFamily: font.regular,
    maxWidth: 320,
  },
});
