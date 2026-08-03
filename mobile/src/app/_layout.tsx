import { DarkTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import { MaterialSymbols_400Regular } from "@expo-google-fonts/material-symbols/400Regular";
import { LoadingScreen } from "@/components/loading-screen";
import { UpdateScreen, UpdatePhase } from "@/components/update-screen";
import { colors, font } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

/**
 * Applies a pending EAS update at launch behind a branded progress screen.
 *
 * Only ever engages during startup: `armed` latches false once the app is
 * running, so an update discovered later never restarts the app out from under
 * someone mid-order. That one waits for the next cold start.
 */
function useLaunchUpdate(): { phase: UpdatePhase; progress?: number } | null {
  const { isChecking, isDownloading, isUpdateAvailable, isUpdatePending, downloadProgress } =
    Updates.useUpdates();
  const [armed, setArmed] = useState(Updates.isEnabled);
  const fetching = useRef(false);

  // Anything not resolved in the first few seconds of launch is left for the
  // next cold start rather than interrupting the session.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => {
      if (!isDownloading && !isUpdatePending) setArmed(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [armed, isDownloading, isUpdatePending]);

  useEffect(() => {
    if (!armed || !Updates.isEnabled) return;
    if (isUpdateAvailable && !isUpdatePending && !isDownloading && !fetching.current) {
      fetching.current = true;
      Updates.fetchUpdateAsync().catch(() => setArmed(false));
    }
  }, [armed, isUpdateAvailable, isUpdatePending, isDownloading]);

  useEffect(() => {
    if (!armed || !isUpdatePending) return;
    // Let the bar land on 100% before the screen goes away.
    const t = setTimeout(() => {
      Updates.reloadAsync().catch(() => setArmed(false));
    }, 700);
    return () => clearTimeout(t);
  }, [armed, isUpdatePending]);

  if (!armed) return null;
  if (isUpdatePending) return { phase: "applying" };
  if (isDownloading) return { phase: "downloading", progress: downloadProgress };
  // Only worth a screen if there's actually something to fetch.
  if (isChecking && isUpdateAvailable) return { phase: "checking" };
  return null;
}

export default function RootLayout() {
  const updating = useLaunchUpdate();
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    MaterialSymbols_400Regular,
  });

  useEffect(() => {
    // Hand off from the native splash to our branded loading screen right away.
    SplashScreen.hideAsync();
  }, []);

  // The update screen wins over the font gate: it uses no custom fonts, and an
  // update in flight is the more informative thing to show.
  if (updating) return <UpdateScreen phase={updating.phase} progress={updating.progress} />;

  if (!loaded) return <LoadingScreen />;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: font.bold, fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="restaurants" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen name="plans" options={{ title: "Choose your plan" }} />
        <Stack.Screen name="restaurant/new" options={{ title: "New Restaurant" }} />
        <Stack.Screen name="restaurant/[id]/index" options={{ title: "Menu" }} />
        <Stack.Screen name="restaurant/[id]/qr" options={{ title: "QR Code" }} />
        <Stack.Screen name="restaurant/[id]/orders" options={{ title: "Orders" }} />
        <Stack.Screen name="restaurant/[id]/settings" options={{ title: "Restaurant Settings" }} />
        <Stack.Screen name="item/new" options={{ title: "New Dish" }} />
        <Stack.Screen name="item/[id]" options={{ title: "Edit Dish" }} />
      </Stack>
    </ThemeProvider>
  );
}
