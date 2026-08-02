import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, Order } from "@/lib/api";
import { formatPrice } from "@/lib/currencies";
import { Badge, BadgeTone, Button, Card, EmptyState } from "@/components/ui";
import { colors, font } from "@/lib/theme";

const STATUS_META: Record<Order["status"], { label: string; tone: BadgeTone }> = {
  NEW: { label: "NEW", tone: "accent" },
  PREPARING: { label: "PREPARING", tone: "sky" },
  DONE: { label: "DONE", tone: "success" },
  CANCELLED: { label: "CANCELLED", tone: "neutral" },
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function Orders() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<string | undefined>(undefined);

  // Fetched once — order totals are meaningless without the currency, and the
  // orders payload doesn't carry it.
  useEffect(() => {
    let active = true;
    api
      .getRestaurant(id)
      .then(({ restaurant }) => {
        if (active) setCurrency(restaurant.currency);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  const load = useCallback(async () => {
    try {
      const { orders } = await api.listOrders(id);
      setOrders(orders);
    } catch {
      // pull-to-refresh retries; avoid alert spam on focus polling
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 15_000); // kitchen screen: refresh every 15s
      return () => clearInterval(t);
    }, [load])
  );

  // Separate from `loading` so the 15s poll never spins the pull-to-refresh
  // control while the kitchen is looking at the list.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const advance = async (order: Order) => {
    const next: Order["status"] =
      order.status === "NEW" ? "PREPARING" : order.status === "PREPARING" ? "DONE" : "DONE";
    try {
      await api.updateOrder(order.id, next);
      load();
    } catch (err) {
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Try again");
    }
  };

  const cancel = (order: Order) => {
    Alert.alert("Cancel this order?", `Order ${order.code} will be marked cancelled.`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          try {
            await api.updateOrder(order.id, "CANCELLED");
            load();
          } catch (err) {
            Alert.alert("Something went wrong", err instanceof Error ? err.message : "Try again");
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}
      data={orders}
      keyExtractor={(o) => o.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="receipt"
            title="No orders yet"
            body="When customers order from your menu, they'll appear here the moment they're placed."
          />
        )
      }
      renderItem={({ item: order }) => {
        const meta = STATUS_META[order.status];
        return (
          <Card style={styles.orderCard}>
            <View style={styles.headerRow}>
              <Text style={styles.code} allowFontScaling={false}>
                #{order.code}
              </Text>
              <Badge label={meta.label} tone={meta.tone} dot={order.status === "NEW"} />
              <Text style={styles.time}>{timeAgo(order.createdAt)}</Text>
            </View>

            {(order.tableNumber || order.customerName) !== "" && (
              <Text style={styles.meta}>
                {order.tableNumber ? `Table ${order.tableNumber}` : ""}
                {order.tableNumber && order.customerName ? " · " : ""}
                {order.customerName}
              </Text>
            )}

            <View style={styles.lines}>
              {order.items.map((l, i) => (
                <View key={i} style={styles.lineRow}>
                  <Text style={styles.lineQty} allowFontScaling={false}>
                    {l.quantity}×
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName}>{l.name}</Text>
                    {l.options.length > 0 && (
                      <Text style={styles.lineOpts}>{l.options.join(" · ")}</Text>
                    )}
                  </View>
                  <Text style={styles.lineTotal} allowFontScaling={false}>
                    {formatPrice(l.lineTotal, currency)}
                  </Text>
                </View>
              ))}
            </View>

            {order.note !== "" && (
              <Text style={styles.note}>“{order.note}”</Text>
            )}

            <View style={styles.footerRow}>
              <Text style={styles.total} allowFontScaling={false}>
                {formatPrice(order.total, currency)}
              </Text>
              {(order.status === "NEW" || order.status === "PREPARING") && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    title="Cancel"
                    small
                    variant="ghost"
                    onPress={() => cancel(order)}
                  />
                  <Button
                    title={order.status === "NEW" ? "Start preparing" : "Mark done"}
                    small
                    onPress={() => advance(order)}
                  />
                </View>
              )}
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  orderCard: { marginBottom: 12, padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  code: { color: colors.text, fontSize: 17, fontFamily: font.heavy },
  time: { marginLeft: "auto", color: colors.textFaint, fontSize: 12, fontFamily: font.regular },
  meta: { color: colors.textDim, fontSize: 13, marginTop: 6, fontFamily: font.semibold },
  lines: { marginTop: 10, gap: 6 },
  lineRow: { flexDirection: "row", gap: 10 },
  lineQty: { color: colors.accent, fontSize: 14, fontFamily: font.heavy, width: 28 },
  lineName: { color: colors.text, fontSize: 14, fontFamily: font.medium },
  lineOpts: { color: colors.textFaint, fontSize: 12, marginTop: 1, fontFamily: font.regular },
  lineTotal: { color: colors.textDim, fontSize: 13, fontFamily: font.semibold },
  note: {
    color: colors.sky,
    fontSize: 13,
    marginTop: 10,
    fontFamily: font.regular,
    fontStyle: "italic",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: { color: colors.accent, fontSize: 17, fontFamily: font.heavy },
});
