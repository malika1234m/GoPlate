import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Full-screen "we're updating" state, shown while an EAS update downloads.
 *
 * Uses no custom fonts or icon glyphs so it can render before those finish
 * loading — the same constraint as the boot LoadingScreen.
 */

/** Sampled from the artwork so it fills edge-to-edge on any aspect ratio. */
const PAPER = "#eddbc8";
const INK = "#2a251d";
const INK_DIM = "#8a7c6a";
const ACCENT = "#f0762e";
const TRACK = "rgba(42,37,29,0.13)";

const { width } = Dimensions.get("window");
const BAR_WIDTH = Math.min(width - 64, 320);
/** Width of the sweeping block used when there's no real percentage yet. */
const SWEEP_WIDTH = BAR_WIDTH * 0.4;

export type UpdatePhase = "checking" | "downloading" | "applying";

const PHASE_TEXT: Record<UpdatePhase, { title: string; body: string }> = {
  checking: {
    title: "Checking for updates",
    body: "Making sure you have the latest GoPlate.",
  },
  downloading: {
    title: "Updating GoPlate",
    body: "Grabbing the newest version — this only takes a moment.",
  },
  applying: {
    title: "Almost there",
    body: "Applying the update and restarting.",
  },
};

export function UpdateScreen({
  phase,
  progress,
}: {
  phase: UpdatePhase;
  /** 0–1 from expo-updates. Undefined until the server reports a size. */
  progress?: number;
}) {
  const insets = useSafeAreaInsets();
  const copy = PHASE_TEXT[phase];

  // A real percentage only exists while downloading and once the server has
  // sent Content-Length. Everything else sweeps instead of inventing a number.
  const determinate = phase === "downloading" && typeof progress === "number";
  const pct = determinate ? Math.max(0, Math.min(1, progress)) : 0;

  // Lazy state rather than refs: these are read during render to build styles,
  // which the React Compiler (correctly) rejects for refs.
  const [fill] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!determinate) return;
    Animated.timing(fill, {
      toValue: pct,
      duration: 240,
      easing: Easing.out(Easing.quad),
      // Width can't be driven natively; this bar is on screen briefly.
      useNativeDriver: false,
    }).start();
  }, [determinate, pct, fill]);

  useEffect(() => {
    if (determinate) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [determinate, sweep]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Image
        source={require("../../assets/images/update-screen.png")}
        style={styles.art}
        resizeMode="cover"
        fadeDuration={0}
      />

      {/* The artwork has three decorative dots baked in near the bottom; this
          fade covers them so they don't strike through the status text. */}
      <LinearGradient
        colors={["rgba(237,219,200,0)", PAPER, PAPER]}
        locations={[0, 0.45, 1]}
        style={[styles.scrim, { paddingBottom: insets.bottom + 34 }]}
        pointerEvents="none"
      />

      <View style={[styles.panel, { paddingBottom: insets.bottom + 34 }]}>
        <Text style={styles.title} allowFontScaling={false}>
          {copy.title}
        </Text>
        <Text style={styles.body}>{copy.body}</Text>

        <View style={styles.track}>
          {determinate ? (
            <Animated.View
              style={[
                styles.fill,
                {
                  width: fill.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, BAR_WIDTH],
                  }),
                },
              ]}
            />
          ) : (
            <Animated.View
              style={[
                styles.fill,
                {
                  width: SWEEP_WIDTH,
                  transform: [
                    {
                      translateX: sweep.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-SWEEP_WIDTH, BAR_WIDTH],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>

        <Text style={styles.pct} allowFontScaling={false}>
          {determinate ? `${Math.round(pct * 100)}%` : "Please keep the app open"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  art: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "30%",
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: { color: INK, fontSize: 19, fontWeight: "700", textAlign: "center" },
  body: {
    color: INK_DIM,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 300,
  },
  track: {
    width: BAR_WIDTH,
    height: 7,
    borderRadius: 4,
    backgroundColor: TRACK,
    overflow: "hidden",
    marginTop: 18,
  },
  fill: { height: "100%", borderRadius: 4, backgroundColor: ACCENT },
  pct: {
    color: INK_DIM,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
    letterSpacing: 0.3,
  },
});
