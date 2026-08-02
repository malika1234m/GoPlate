import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { Button, Icon } from "@/components/ui";
import { colors, font, radius } from "@/lib/theme";

export const ONBOARDED_KEY = "goplate_onboarded";

const { width } = Dimensions.get("window");

/* Light stage matching the artwork's paper background so the slides blend in. */
const CREAM = "#fdf8f3";
const INK = "#2a251d";
const INK_DIM = "#8c8577";
const DOT = "#e3dccb";

const SLIDES: { image: ImageSourcePropType; color: string }[] = [
  { image: require("../../assets/images/onboard-1.png"), color: colors.accent },
  { image: require("../../assets/images/onboard-2.png"), color: colors.accent },
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = async (to: "/register" | "/login") => {
    await SecureStore.setItemAsync(ONBOARDED_KEY, "1").catch(() => {});
    router.replace(to);
  };

  const next = () => {
    if (last) return;
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="dark" />

      {/* Slides — full-bleed art on the same paper background */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View
            style={{
              width,
              paddingTop: insets.top + 58,
              paddingBottom: 150,
            }}
          >
            <Image
              source={item.image}
              style={{ flex: 1, width: "100%" }}
              resizeMode="contain"
            />
          </View>
        )}
      />

      {/* Brand + skip, overlaid on the art */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brand}>
          <Image
            source={require("../../assets/images/plate-logo.png")}
            style={{ width: 34, height: 34 }}
          />
          <Text style={styles.brandText} allowFontScaling={false}>
            <Text style={{ color: colors.accent }}>Go</Text>Plate
          </Text>
        </View>
        <Pressable onPress={() => finish("/login")} hitSlop={10}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Bottom controls floating over a soft fade of the same paper color */}
      <LinearGradient
        colors={["rgba(253,248,243,0)", CREAM, CREAM]}
        style={[styles.footer, { paddingBottom: insets.bottom + 22 }]}
      >
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && { width: 26, backgroundColor: SLIDES[index].color },
              ]}
            />
          ))}
        </View>

        {last ? (
          <>
            {/* The tour ends at sign-in: most people arriving here already
                registered on the web, and new users get the create-account
                link right below. */}
            <Button
              title="Get started"
              icon="arrow_forward"
              onPress={() => finish("/login")}
            />
            <Pressable onPress={() => finish("/register")} style={styles.signIn} hitSlop={8}>
              <Text style={styles.signInText}>
                New to GoPlate?{" "}
                <Text style={{ color: colors.accent, fontFamily: font.semibold }}>
                  Create an account
                </Text>
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={next}>
            {({ pressed }) => (
              <View style={[styles.nextBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.nextText} allowFontScaling={false}>
                  Next
                </Text>
                <Icon name="arrow_forward" size={18} color={INK} />
              </View>
            )}
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: { color: INK, fontSize: 17, fontFamily: font.heavy },
  skip: { color: INK_DIM, fontSize: 14, fontFamily: font.semibold, padding: 4 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 44,
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOT,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: radius.full,
    paddingVertical: 15,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  nextText: { color: INK, fontSize: 15, fontFamily: font.bold, letterSpacing: 0.3 },
  signIn: { alignItems: "center", paddingVertical: 2 },
  signInText: { color: INK_DIM, fontSize: 14, fontFamily: font.regular },
});
