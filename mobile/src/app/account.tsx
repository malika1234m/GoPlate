import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, setToken, User } from "@/lib/api";
import { useKeyboardPadding } from "@/lib/keyboard";
import { Button, Card, IconCircle, Input, SectionHeader } from "@/components/ui";
import { colors, font } from "@/lib/theme";

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  const [user, setUser] = useState<User | null>(null);

  // Change password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        Alert.alert("Could not load account", "Check your connection and try again.");
        router.back();
      });
  }, [router]);

  if (!user)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );

  const currentError = touched && !current ? "Enter your current password." : "";
  const nextError = touched && next.length < 8 ? "Use at least 8 characters." : "";
  const confirmError = touched && confirm !== next ? "Passwords don't match." : "";

  const changePassword = async () => {
    setTouched(true);
    if (!current || next.length < 8 || confirm !== next) return;
    setSaving(true);
    try {
      const { token } = await api.changePassword(current, next);
      // Fresh token — other devices are signed out, this one stays in.
      await setToken(token);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTouched(false);
      Alert.alert("Password changed", "Any other signed-in devices have been signed out.");
    } catch (err) {
      Alert.alert("Could not change password", err instanceof Error ? err.message : "Try again");
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    Alert.alert("Sign out", "You'll need your email and password to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await setToken(null);
          router.dismissAll();
          router.replace("/login");
        },
      },
    ]);
  };

  const deleteAccount = () => {
    if (!deletePassword) {
      Alert.alert("Password needed", "Enter your password to confirm deletion.");
      return;
    }
    Alert.alert(
      "Delete account forever?",
      "This permanently deletes your account, restaurants, menus, and all uploaded media. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount(deletePassword);
              await setToken(null);
              router.dismissAll();
              router.replace("/login");
            } catch (err) {
              Alert.alert(
                "Could not delete account",
                err instanceof Error ? err.message : "Try again"
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 + keyboardPad }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* Identity */}
      <Card style={styles.identity}>
        <IconCircle name="person" size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Card>

      {/* Change password */}
      <SectionHeader title="Change password" hint="Signs out every other device." />
      <Card style={{ padding: 18 }}>
        <Input
          label="Current password"
          value={current}
          onChangeText={(v) => setCurrent(v.replace(/\s/g, ""))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          error={currentError}
        />
        <Input
          label="New password"
          value={next}
          onChangeText={(v) => setNext(v.replace(/\s/g, ""))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
          error={nextError}
        />
        <Input
          label="Confirm new password"
          value={confirm}
          onChangeText={(v) => setConfirm(v.replace(/\s/g, ""))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          error={confirmError}
        />
        <Button title="Update password" icon="lock" onPress={changePassword} loading={saving} />
      </Card>

      {/* Session */}
      <SectionHeader title="Session" />
      <Button title="Sign out" icon="logout" variant="secondary" onPress={signOut} />

      {/* Danger zone */}
      <SectionHeader
        title="Danger zone"
        hint="Deleting your account removes your restaurants, menus, and media permanently."
      />
      <Card style={{ borderColor: "rgba(224,82,63,0.35)", padding: 18 }}>
        <Input
          label="Your password"
          value={deletePassword}
          onChangeText={(v) => setDeletePassword(v.replace(/\s/g, ""))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Confirm with your password"
        />
        <Button
          title="Delete account forever"
          icon="delete"
          variant="danger"
          onPress={deleteAccount}
          loading={deleting}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  name: { color: colors.text, fontSize: 18, fontFamily: font.bold },
  email: { color: colors.textFaint, fontSize: 13.5, marginTop: 2, fontFamily: font.regular },
});
