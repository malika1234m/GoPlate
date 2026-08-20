import { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { api, ApiError, mediaUrl, setToken, API_URL, Restaurant, User } from "@/lib/api";
import { startUpgrade } from "@/lib/upgrade";
import { maybeShowTrialNudge } from "@/lib/trial-nudge";
import { Badge, Button, Card, EmptyState, Icon, IconCircle } from "@/components/ui";
import { colors, font, GlyphName, radius } from "@/lib/theme";

type Billing = Awaited<ReturnType<typeof api.billing>>;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Restaurants() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const { restaurants } = await api.listRestaurants();
      if (!isActive()) return;
      setOffline(false);
      setRestaurants(restaurants);
      api
        .me()
        .then(({ user }) => {
          if (isActive()) setUser(user);
        })
        .catch(() => {});
      api
        .billing()
        .then((b) => {
          if (!isActive()) return;
          setBilling(b);
          maybeShowTrialNudge(b);
        })
        .catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session expired — return to login
        await setToken(null);
        router.replace("/login");
      } else if (isActive()) {
        // Network problem — keep the session and show a retry state rather than
        // the empty state, which would read as "your restaurants are gone".
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      return () => {
        active = false;
      };
    }, [load])
  );

  /**
   * Pull-to-refresh keeps its own flag — this screen reloads on every focus, so
   * sharing `loading` would flash the spinner each time the user comes back.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const first = restaurants[0];

  const tips: {
    icon: GlyphName;
    color: string;
    bg: string;
    title: string;
    body: string;
    onPress: () => void;
  }[] = first
    ? [
        {
          icon: "videocam",
          color: colors.sky,
          bg: colors.skySoft,
          title: "Film a dish in 360°",
          body: "Walk slowly around the plate — that's it.",
          onPress: () => router.push(`/restaurant/${first.id}`),
        },
        {
          icon: "view_in_ar",
          color: colors.accent,
          bg: colors.accentSoft,
          title: "Put dishes in 3D",
          body: "Customers spin them right on the menu.",
          onPress: () =>
            billing?.accessActive ? router.push(`/restaurant/${first.id}`) : startUpgrade(),
        },
        {
          icon: "qr_code",
          color: colors.success,
          bg: colors.successSoft,
          title: "Print your QR code",
          body: "One scan opens your menu — no app.",
          onPress: () => router.push(`/restaurant/${first.id}/qr`),
        },
        {
          icon: "settings",
          color: "#c9a1f0",
          bg: "rgba(138,92,214,0.16)",
          title: "Make it yours",
          body: "Theme, accent color, logo & cover.",
          onPress: () => router.push(`/restaurant/${first.id}/settings`),
        },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 14,
          // Clear the floating button, which itself clears the nav bar.
          paddingBottom: insets.bottom + 130,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Greeting header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>
              {greeting()}
              {user?.name ? "," : ""}
            </Text>
            {user?.name ? (
              <Text style={styles.helloName} numberOfLines={1}>
                {user.name.split(" ")[0]} 👋
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push("/account")}
            style={styles.logoutBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Account settings"
          >
            <Icon name="person" size={19} color={colors.textDim} />
          </Pressable>
        </View>

        {offline && restaurants.length === 0 && !loading && (
          <Card style={styles.offlineCard}>
            <IconCircle name="link" size={48} color={colors.danger} background={colors.dangerSoft} />
            <Text style={styles.offlineTitle}>Can&apos;t reach GoPlate</Text>
            <Text style={styles.offlineBody}>
              Your restaurants are safe — we just couldn&apos;t load them. Check your connection and
              try again.
            </Text>
            <Button title="Try again" variant="secondary" onPress={() => load()} />
          </Card>
        )}

        {offline && restaurants.length > 0 && (
          <Pressable onPress={() => load()} style={styles.offlineBanner}>
            <Icon name="link" size={16} color={colors.danger} />
            <Text style={styles.offlineBannerText}>
              Couldn&apos;t refresh — showing what we last loaded. Tap to retry.
            </Text>
          </Pressable>
        )}

        {!offline && restaurants.length === 0 && !loading && (
          <EmptyState
            icon="storefront"
            title="No restaurants yet"
            body="Create your first restaurant to start building a 3D menu your customers will love."
          />
        )}

        {/* Hero restaurant cards */}
        {restaurants.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/restaurant/${item.id}`)}>
            {({ pressed }) => (
              <View style={[styles.hero, pressed && { opacity: 0.92 }]}>
                {/* Cover */}
                <View style={styles.heroCover}>
                  {item.coverUrl ? (
                    <Image source={{ uri: mediaUrl(item.coverUrl) }} style={styles.heroCoverImg} />
                  ) : (
                    <LinearGradient
                      colors={["#2a1608", "#141210", "#0d1319"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroCoverImg}
                    />
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(9,9,10,0.96)"]}
                    style={styles.heroShade}
                  />
                  {!item.coverUrl && (
                    <Icon
                      name="restaurant_menu"
                      size={92}
                      color="rgba(240,118,46,0.12)"
                      style={styles.heroWatermark}
                    />
                  )}
                  <View style={styles.heroBadge}>
                    <Badge
                      label={item.isPublished ? "LIVE" : "HIDDEN"}
                      tone={item.isPublished ? "success" : "neutral"}
                      dot
                    />
                  </View>
                </View>

                {/* Body */}
                <View style={styles.heroBody}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {item.logoUrl ? (
                      <Image source={{ uri: mediaUrl(item.logoUrl) }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarLetter} allowFontScaling={false}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.meta}>
                        {item._count?.items ?? 0} dishes · {item._count?.categories ?? 0} categories
                      </Text>
                    </View>
                  </View>

                  {/* Quick actions */}
                  <View style={styles.heroActions}>
                    {(
                      [
                        ["restaurant_menu", "Menu", () => router.push(`/restaurant/${item.id}`)],
                        ["qr_code", "QR", () => router.push(`/restaurant/${item.id}/qr`)],
                        [
                          "visibility",
                          "Preview",
                          () => WebBrowser.openBrowserAsync(`${API_URL}/r/${item.slug}`),
                        ],
                      ] as [GlyphName, string, () => void][]
                    ).map(([icon, label, onPress]) => (
                      <Pressable key={label} onPress={onPress} style={styles.heroAction}>
                        <Icon name={icon} size={17} color={colors.accent} />
                        <Text style={styles.heroActionText} allowFontScaling={false}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        ))}

        {/* Tips rail */}
        {tips.length > 0 && (
          <>
            <Text style={styles.railTitle}>Make your menu irresistible</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 6 }}
              style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
            >
              {tips.map((tip) => (
                <Pressable key={tip.title} onPress={tip.onPress}>
                  {({ pressed }) => (
                    <Card
                      style={[styles.tipCard, pressed && { borderColor: colors.borderLight }]}
                    >
                      <IconCircle name={tip.icon} size={38} color={tip.color} background={tip.bg} />
                      <Text style={styles.tipTitle} allowFontScaling={false}>
                        {tip.title}
                      </Text>
                      <Text style={styles.tipBody}>{tip.body}</Text>
                    </Card>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* Plan */}
        {billing &&
          (!billing.subscribed ? (
            <Pressable onPress={startUpgrade} style={{ marginTop: 22 }}>
              {({ pressed }) => (
                <LinearGradient
                  colors={["#f0762e", "#d4531a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.proBanner, pressed && { opacity: 0.92 }]}
                >
                  <View style={styles.proIconWrap}>
                    <Icon name="workspace_premium" size={26} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proTitle} allowFontScaling={false}>
                      {billing.accessActive
                        ? `Free trial — ${billing.trialDaysLeft} day${billing.trialDaysLeft === 1 ? "" : "s"} left`
                        : "Your free month has ended"}
                    </Text>
                    <Text style={styles.proBody}>
                      {billing.accessActive
                        ? "Pick a plan from $2/mo to keep everything after the trial."
                        : "Choose a plan from $2/mo to keep editing. Your menu is still live for customers."}
                    </Text>
                  </View>
                  <Icon name="chevron_right" size={22} color="#fff" />
                </LinearGradient>
              )}
            </Pressable>
          ) : (
            <Card style={{ marginTop: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <IconCircle name="workspace_premium" size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{billing.label} plan</Text>
                  <Text style={styles.planMeta}>
                    {/* Every plan has a ceiling now, so every plan shows its
                        usage. This used to special-case Starter and tell
                        everyone else "Unlimited" — which was wrong for Basic
                        as well as Pro. */}
                    {`${billing.usage.videos}/${billing.limits.maxVideos} videos · ` +
                      `${billing.usage.models}/${billing.limits.maxModels} 3D models` +
                      (billing.limits.maxRestaurants > 1
                        ? ` · ${billing.usage.restaurants}/${billing.limits.maxRestaurants} restaurants`
                        : "")}
                  </Text>
                </View>
                <Button
                  title="Manage"
                  small
                  variant="secondary"
                  onPress={startUpgrade}
                />
              </View>
            </Card>
          ))}
      </ScrollView>

      <View style={[styles.fab, { bottom: insets.bottom + 20 }]}>
        <Button title="New restaurant" icon="add" onPress={() => router.push("/restaurant/new")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    marginTop: 2,
  },
  hello: { color: colors.textFaint, fontSize: 14, fontFamily: font.medium },
  helloName: { color: colors.text, fontSize: 26, fontFamily: font.heavy, marginTop: 1 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 14,
  },
  offlineBannerText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: font.medium,
  },
  offlineCard: { alignItems: "center", gap: 12, padding: 24, marginTop: 8 },
  offlineTitle: { color: colors.text, fontSize: 17, fontFamily: font.bold },
  offlineBody: {
    color: colors.textFaint,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: font.regular,
    marginBottom: 4,
  },
  hero: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 14,
  },
  heroCover: { height: 128 },
  heroCoverImg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  heroShade: { position: "absolute", inset: 0 },
  heroWatermark: { position: "absolute", right: 10, top: 8 },
  heroBadge: { position: "absolute", top: 12, left: 14 },
  heroBody: { padding: 14, paddingTop: 0, marginTop: -26 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: colors.accent, fontSize: 24, fontFamily: font.heavy },
  name: { color: colors.text, fontSize: 19, fontFamily: font.heavy },
  meta: { color: colors.textDim, fontSize: 12.5, marginTop: 1, fontFamily: font.regular },
  heroActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  heroAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 9,
  },
  heroActionText: { color: colors.text, fontSize: 13, fontFamily: font.semibold },
  railTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: font.heavy,
    marginTop: 10,
    marginBottom: 10,
  },
  tipCard: { width: 168, padding: 14, gap: 8, borderRadius: radius.lg },
  tipTitle: { color: colors.text, fontSize: 13.5, fontFamily: font.bold, marginTop: 2 },
  tipBody: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 16.5,
    fontFamily: font.regular,
  },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    padding: 16,
  },
  proIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  proTitle: { color: "#fff", fontSize: 15, fontFamily: font.heavy },
  proBody: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    fontFamily: font.medium,
  },
  planTitle: { color: colors.text, fontSize: 15, fontFamily: font.bold },
  planMeta: { color: colors.textFaint, fontSize: 12.5, marginTop: 1, fontFamily: font.regular },
  fab: { position: "absolute", left: 20, right: 20 },
});
