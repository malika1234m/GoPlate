import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { api, API_URL } from "@/lib/api";
import { Badge, Button, Card, Icon } from "@/components/ui";
import { colors, font, radius } from "@/lib/theme";

type PlanId = "basic" | "starter" | "pro";
type Billing = Awaited<ReturnType<typeof api.billing>>;

// Subscriptions are managed on the web to stay clear of Google Play's
// payments policy for in-app digital purchases.
const ACCOUNT_URL = `${API_URL}/account`;

type Period = "monthly" | "yearly";

// Yearly is twelve months for the price of ten — the same numbers the website
// charges (web/src/lib/plans.ts). Kept in sync by hand because the mobile app
// only ever displays them; the actual purchase happens on the web.
const PLANS: {
  id: PlanId;
  name: string;
  priceUsd: number;
  priceYearlyUsd: number;
  tagline: string;
  popular?: boolean;
  features: string[];
}[] = [
  {
    id: "basic",
    name: "Basic",
    priceUsd: 2,
    priceYearlyUsd: 20,
    tagline: "Your menu, live and looking good",
    features: [
      "1 restaurant",
      "Unlimited dishes & photos",
      "2 dish videos, auto-edited",
      "2 photoreal 3D models",
      "QR code & custom themes",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceUsd: 12,
    priceYearlyUsd: 120,
    tagline: "Bring your best dishes to life",
    popular: true,
    features: [
      "Everything in Basic",
      "10 dish videos, auto-edited",
      "10 photoreal 3D models",
      "AR — dishes on the customer's table",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceUsd: 29,
    priceYearlyUsd: 290,
    tagline: "The full 3D experience, plus live ordering",
    features: [
      "Everything in Starter",
      "Unlimited videos & 3D models",
      "Your entire menu in 3D",
      "Live table ordering from your menu",
      "Kitchen orders screen — New → Preparing → Done",
      "Up to 10 restaurants",
    ],
  },
];

const SAVING_PERCENT = Math.floor(
  ((PLANS[1].priceUsd * 12 - PLANS[1].priceYearlyUsd) / (PLANS[1].priceUsd * 12)) * 100
);

export default function Plans() {
  const insets = useSafeAreaInsets();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [opening, setOpening] = useState(false);
  const [period, setPeriod] = useState<Period>("monthly");

  const loadBilling = () => {
    api
      .billing()
      .then(setBilling)
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    api
      .billing()
      .then((b) => {
        if (!cancelled) setBilling(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Payment happens on the website. Open it, then refresh plan status on return
  // so a completed upgrade shows immediately.
  const openBilling = async () => {
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(ACCOUNT_URL);
      loadBilling();
    } catch {
      Alert.alert("Couldn't open the browser", "Visit GoPlate on the web to manage your plan.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}
    >
      {/* Trial / plan status */}
      {billing && !billing.subscribed && (
        <Card style={styles.trialCard}>
          <Icon
            name="schedule"
            size={20}
            color={billing.accessActive ? colors.sky : colors.danger}
          />
          <Text style={styles.trialText}>
            {billing.accessActive
              ? `Free trial — ${billing.trialDaysLeft} day${billing.trialDaysLeft === 1 ? "" : "s"} left. Choose a plan on the web to continue without interruption.`
              : "Your free month has ended. Choose a plan on the web to keep editing — your menu stays live for customers."}
          </Text>
        </Card>
      )}
      {billing?.subscribed && (
        <Card style={styles.trialCard}>
          <Icon name="check" size={20} color={colors.success} />
          <Text style={styles.trialText}>
            You&apos;re on the {billing.label} plan. Manage or change your subscription on the web.
          </Text>
        </Card>
      )}

      {/* Upgrade / manage happens on the website (not in-app) */}
      <Card style={styles.webCard}>
        <View style={styles.webIcon}>
          <Icon name="link" size={22} color={colors.accent} />
        </View>
        <Text style={styles.webTitle}>
          {billing?.subscribed ? "Manage your subscription" : "Upgrade on our website"}
        </Text>
        <Text style={styles.webBody}>
          Plans and secure payment are handled on the GoPlate website. Sign in with this same
          account to choose or change your plan.
        </Text>
        <Button
          title={billing?.subscribed ? "Manage on the web" : "Upgrade on the web"}
          onPress={openBilling}
          loading={opening}
        />
      </Card>

      {/* Monthly / yearly. Display only — payment still happens on the web. */}
      <View style={styles.periodToggle}>
        {(["monthly", "yearly"] as Period[]).map((p) => {
          const on = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodOption, on && styles.periodOptionOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.periodLabel, on && styles.periodLabelOn]}>
                {p === "monthly" ? "Monthly" : "Yearly"}
              </Text>
              {p === "yearly" && (
                <Text style={[styles.periodSave, on && styles.periodSaveOn]}>
                  −{SAVING_PERCENT}%
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {PLANS.map((plan) => {
        const isCurrent = billing?.subscribed && billing.plan === plan.id;
        return (
          <Card
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular && { borderColor: colors.accent, borderWidth: 1.5 },
            ]}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Badge label="MOST POPULAR" tone="accent" />
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planTagline}>{plan.tagline}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.planPrice} allowFontScaling={false}>
                  ${period === "yearly" ? plan.priceYearlyUsd : plan.priceUsd}
                </Text>
                <Text style={styles.planPeriod}>
                  {period === "yearly" ? "per year" : "per month"}
                </Text>
                {period === "yearly" && (
                  <Text style={styles.planPeriodNote}>
                    ${(plan.priceYearlyUsd / 12).toFixed(2)}/mo
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.features}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Icon name="check" size={16} color={plan.popular ? colors.accent : colors.sky} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {isCurrent && (
              <View style={styles.currentPlan}>
                <Icon name="check" size={17} color={colors.success} />
                <Text style={styles.currentPlanText}>Your current plan</Text>
              </View>
            )}
          </Card>
        );
      })}

      <Text style={styles.finePrint}>
        Every new account starts with a 30-day free trial. Payment is handled securely by Stripe —
        cancel anytime, no contracts.
      </Text>

      {billing === null && (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  periodToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 16,
  },
  periodOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  periodOptionOn: { backgroundColor: colors.accent },
  periodLabel: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: font.semibold,
  },
  periodLabelOn: { color: "#fff" },
  periodSave: { color: colors.success, fontSize: 11.5, fontFamily: font.bold },
  periodSaveOn: { color: "#fff" },
  planPeriodNote: {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: font.regular,
    marginTop: 2,
  },
  trialCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 16,
    borderRadius: radius.lg,
  },
  trialText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: font.medium,
  },
  webCard: { padding: 18, marginBottom: 20, borderRadius: radius.xl, gap: 10 },
  webIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },
  webTitle: { color: colors.text, fontSize: 17, fontFamily: font.heavy },
  webBody: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
    fontFamily: font.regular,
  },
  planCard: { marginBottom: 14, padding: 18, borderRadius: radius.xl },
  popularBadge: { position: "absolute", top: -10, right: 18 },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planName: { color: colors.text, fontSize: 20, fontFamily: font.heavy },
  planTagline: {
    color: colors.textFaint,
    fontSize: 12.5,
    marginTop: 2,
    fontFamily: font.regular,
  },
  planPrice: { color: colors.accent, fontSize: 28, fontFamily: font.heavy },
  planPeriod: {
    color: colors.textFaint,
    fontSize: 11.5,
    fontFamily: font.regular,
  },
  features: { marginTop: 14, marginBottom: 16, gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  featureText: {
    color: colors.textDim,
    fontSize: 13.5,
    fontFamily: font.regular,
    flex: 1,
  },
  currentPlan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
  },
  currentPlanText: {
    color: colors.success,
    fontSize: 14,
    fontFamily: font.bold,
  },
  finePrint: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    fontFamily: font.regular,
  },
});
