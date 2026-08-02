
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
import { colors, font, radius } from "@/lib/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? "Enter your name." : "";
  const emailError =
    touched && !EMAIL_RE.test(email.trim()) ? "Enter a valid email address." : "";
  const passwordError =
    touched && password.length < 8 ? "Password must be at least 8 characters." : "";
  const confirmError =
    touched && confirm !== password ? "Passwords don't match." : "";

  const submit = async () => {
    setTouched(true);
    if (
      !name.trim() ||
      !EMAIL_RE.test(email.trim()) ||
      password.length < 8 ||
      confirm !== password
    )
      return;
    setLoading(true);
    try {
      const { token } = await api.register(name.trim(), email.trim(), password);
      await setToken(token);
      // Step 2 of onboarding: restaurant details
      router.replace({ pathname: "/restaurant/new", params: { onboarding: "1" } });
    } catch (err) {
      Alert.alert("Sign up failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          // This screen is taller than a short phone's viewport, so it has to
          // scroll — and the last element (the sign-in link) has to clear the
          // status bar and the gesture/nav bar, or it can't be tapped at all.
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          // Anchor to top while the keyboard is open so fields never hide behind it.
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
          <View style={styles.stepChip}>
            <Text style={styles.stepText} allowFontScaling={false}>
              STEP 1 OF 2 · YOUR ACCOUNT
            </Text>
          </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Next, we&apos;ll set up your restaurant — you&apos;ll have a live 3D menu in minutes.
          </Text>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Alex Chef"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={nameError}
          />
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
          />
          <Input
            label="Password"
            value={password}
            onChangeText={(v) => setPassword(v.replace(/\s/g, ""))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
            error={passwordError}
            hint="Use 8+ characters. A mix of letters and numbers is best."
          />
          <Input
            label="Confirm password"
            value={confirm}
            onChangeText={(v) => setConfirm(v.replace(/\s/g, ""))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Re-enter your password"
            error={confirmError}
          />
          <Button
            title="Continue"
            icon="arrow_forward"
            onPress={submit}
            loading={loading}
            style={{ marginTop: 4 }}
          />
          <Text style={styles.consent}>
            By continuing you agree to our{" "}
            <Text
              style={styles.consentLink}
              onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}
            >
              privacy policy
            </Text>
            .
          </Text>
        </Card>

        <Pressable
          onPress={() => router.replace("/login")}
          style={styles.switchTap}
          hitSlop={10}
        >
          <Text style={styles.switch}>
            Already have an account? <Text style={styles.switchAccent}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
  hero: { alignItems: "center", marginBottom: 26 },
  logoImg: { width: 68, height: 68, marginBottom: 14 },
  stepChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  stepText: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: font.bold,
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 26, fontFamily: font.heavy, textAlign: "center" },
  subtitle: {
    color: colors.textFaint,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: font.regular,
    maxWidth: 310,
  },
  formCard: { padding: 20, borderRadius: 24 },
  switchTap: { marginTop: 20, paddingVertical: 10 },
  switch: {
    color: colors.textDim,
    textAlign: "center",
    fontSize: 14,
    fontFamily: font.regular,
  },
  switchAccent: { color: colors.accent, fontFamily: font.semibold },
  consent: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 17,
    fontFamily: font.regular,
  },
  consentLink: { color: colors.textDim, textDecorationLine: "underline" },
});
