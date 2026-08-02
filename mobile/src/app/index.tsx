import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { api, ApiError, getToken, setToken } from "@/lib/api";
import { LoadingScreen } from "@/components/loading-screen";
import { ONBOARDED_KEY } from "./welcome";

/** Entry point: welcome tour on first launch, then login/dashboard. */
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        const seenTour = await SecureStore.getItemAsync(ONBOARDED_KEY).catch(() => null);
        router.replace(seenTour ? "/login" : "/welcome");
        return;
      }
      try {
        await api.me();
        router.replace("/restaurants");
      } catch (err) {
        // Only a rejected token means the session is really gone. Opening the
        // app on a bad connection must not sign the owner out — the dashboard
        // handles offline itself and lets them retry.
        if (err instanceof ApiError && err.status === 401) {
          await setToken(null);
          router.replace("/login");
        } else {
          router.replace("/restaurants");
        }
      }
    })();
  }, [router]);

  return <LoadingScreen />;
}
