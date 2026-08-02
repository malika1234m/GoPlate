import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { handleUpgradeError } from "@/lib/upgrade";
import { useKeyboardPadding } from "@/lib/keyboard";
import { Button, Card, IconCircle, Input, Select } from "@/components/ui";
import { currencyOptions } from "@/lib/currencies";
import { colors, font, radius } from "@/lib/theme";

export default function NewRestaurant() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const keyboardPad = useKeyboardPadding();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? "Give your restaurant a name." : "";

  const submit = async () => {
    setTouched(true);
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { restaurant } = await api.createRestaurant({
        name: name.trim(),
        description,
        address,
        phone,
        currency: currency || "USD",
      });
      router.replace(`/restaurant/${restaurant.id}`);
    } catch (err) {
      if (!handleUpgradeError(err)) {
        Alert.alert("Could not create restaurant", err instanceof Error ? err.message : "Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOnboarding && <Stack.Screen options={{ headerShown: false }} />}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: isOnboarding ? insets.top + 24 : 16,
          // Clear the gesture/nav bar so the last control stays tappable.
          paddingBottom: insets.bottom + 48 + keyboardPad,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isOnboarding ? (
          <View style={styles.onboardHero}>
            <Image
              source={require("../../../assets/images/plate-logo.png")}
              style={{ width: 60, height: 60, marginBottom: 14 }}
            />
            <View style={styles.stepChip}>
              <Text style={styles.stepText} allowFontScaling={false}>
                STEP 2 OF 2 · YOUR RESTAURANT
              </Text>
            </View>
            <Text style={styles.onboardTitle}>Tell us about your restaurant</Text>
            <Text style={styles.onboardSubtitle}>
              This becomes the header of your public menu. Only the name is required — everything
              else can be added or changed later in Settings.
            </Text>
          </View>
        ) : (
          <View style={styles.intro}>
            <IconCircle name="storefront" size={52} />
            <Text style={styles.introText}>
              Just the basics for now — you can add your logo, colors, and theme later in Settings.
            </Text>
          </View>
        )}

        <Card style={{ padding: 18 }}>
          <Input
            label="Restaurant name"
            value={name}
            onChangeText={setName}
            placeholder="The Copper Kettle"
            error={nameError}
          />
          <Input
            label="Short description"
            value={description}
            onChangeText={setDescription}
            placeholder="Family-run Italian kitchen in the old town"
            hint="One line about your restaurant, shown under its name on your menu. Optional."
            multiline
          />
          <Input
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="12 Market Lane"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555 010 2030"
            keyboardType="phone-pad"
          />
          <Select
            label="Currency"
            title="Choose your currency"
            value={currency}
            onChange={setCurrency}
            options={currencyOptions(currency)}
            searchable
            searchPlaceholder="Search currency or code"
            hint="Shown next to every price on your menu."
          />
        </Card>

        <Button
          title={isOnboarding ? "Finish setup" : "Create restaurant"}
          icon={isOnboarding ? "check" : "add"}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 20 }}
        />

        {isOnboarding && (
          <Pressable onPress={() => router.replace("/restaurants")} style={styles.skip} hitSlop={8}>
            <Text style={styles.skipText}>Skip for now — I&apos;ll add my restaurant later</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
    marginTop: 4,
  },
  introText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: font.regular,
  },
  onboardHero: { alignItems: "center", marginBottom: 22 },
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
  onboardTitle: {
    color: colors.text,
    fontSize: 24,
    fontFamily: font.heavy,
    textAlign: "center",
  },
  onboardSubtitle: {
    color: colors.textFaint,
    fontSize: 13.5,
    marginTop: 6,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: font.regular,
    maxWidth: 320,
  },
  skip: { marginTop: 18, alignItems: "center", paddingVertical: 6 },
  skipText: {
    color: colors.textFaint,
    fontSize: 13.5,
    fontFamily: font.medium,
    textDecorationLine: "underline",
  },
});
