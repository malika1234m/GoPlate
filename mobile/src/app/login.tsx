import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { api, API_URL, setToken } from "@/lib/api";
import { useKeyboardPadding } from "@/lib/keyboard";
import { Button, Card, Input } from "@/components/ui";
import { colors, font } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError = touched && !email.trim() ? "Enter your email address." : "";
  const passwordError = touched && !password ? "Enter your password." : "";

  const submit = async () => {
    // Without this the button silently does nothing on an empty field and the
    // screen looks broken.
    setTouched(true);
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const { token } = await api.login(email.trim(), password);
      await setToken(token);
      router.replace("/restaurants");
    } catch (err) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          // Keep the create-account link clear of the status bar and the
          // gesture/nav bar so it stays tappable on short phones.
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          keyboardPad > 0 && {
            justifyContent: "flex-start",
            paddingBottom: insets.bottom + 32 + keyboardPad,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.hero}>
          <Image source={require("../../assets/images/plate-logo.png")} style={styles.logoImg} />
          <Text style={styles.logo} allowFontScaling={false}>
            <Text style={{ color: colors.accent }}>Go</Text>Plate
          </Text>
          <Text style={styles.tagline}>Your menu, in three dimensions.</Text>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@restaurant.com"
            error={emailError}
            returnKeyType="next"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••••"
            error={passwordError}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button
            title="Sign in"
            icon="arrow_forward"
            onPress={submit}
            loading={loading}
            style={{ marginTop: 4 }}
          />
          {/* Reset happens on the web — the emailed link opens there anyway, so
              there's nothing to duplicate in the app. */}
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/forgot-password`)}
            style={styles.forgotTap}
            hitSlop={8}
          >
            <Text style={styles.forgot}>Forgot your password?</Text>
          </Pressable>
        </Card>

        <Pressable
          onPress={() => router.push("/register")}
          style={styles.switchTap}
          hitSlop={10}
        >
          <Text style={styles.switch}>
            New to GoPlate? <Text style={styles.switchAccent}>Create an account</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
  hero: { alignItems: "center", marginBottom: 28 },
  logoImg: { width: 88, height: 88, marginBottom: 14 },
  logo: {
    color: colors.text,
    fontSize: 38,
    fontFamily: font.heavy,
  },
  tagline: {
    color: colors.textFaint,
    marginTop: 2,
    fontSize: 14,
    fontFamily: font.regular,
  },
  formCard: { padding: 20, borderRadius: 24 },
  forgotTap: { alignItems: "center", marginTop: 14, paddingVertical: 6 },
  forgot: { color: colors.textDim, fontSize: 13.5, fontFamily: font.semibold },
  switchTap: { marginTop: 20, paddingVertical: 10 },
  switch: {
    color: colors.textDim,
    textAlign: "center",
    fontSize: 14,
    fontFamily: font.regular,
  },
  switchAccent: { color: colors.accent, fontFamily: font.semibold },
});
