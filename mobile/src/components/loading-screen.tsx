import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, font } from "@/lib/theme";

/**
 * Branded full-screen loading state. Uses no custom fonts or icon glyphs so
 * it can render while those are still being loaded at app start.
 */

/** Matches the loading artwork's paper background so it fills edge-to-edge. */
const PAPER = "#fbf7f1";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Image
        source={require("../../assets/images/loading-screen.png")}
        style={styles.art}
        resizeMode="cover"
        fadeDuration={0}
      />
      <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
    </View>
  );
}

/**
 * In-app loading state for screens that fetch before they can render anything
 * (menu editor, dish editor, settings, account).
 *
 * Deliberately on the app's dark background rather than reusing the boot
 * artwork above — flashing a full-bleed cream screen inside a dark navigation
 * stack reads as a glitch, not as loading.
 */
export function ScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.screen}>
      <Image
        source={require("../../assets/images/plate-logo.png")}
        style={styles.mark}
        fadeDuration={0}
      />
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: colors.bg,
  },
  mark: { width: 54, height: 54, opacity: 0.9 },
  label: { color: colors.textFaint, fontSize: 13, fontFamily: font.medium },
  art: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  spinner: { position: "absolute", alignSelf: "center", bottom: "6%" },
});
