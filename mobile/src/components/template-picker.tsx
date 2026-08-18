import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, MenuTheme } from "@/lib/api";
import { colors, font, radius } from "@/lib/theme";

/**
 * Menu template chooser for the phone.
 *
 * The catalogue comes from GET /api/menu-themes rather than a list in this
 * file, so mobile can never offer a template the server would reject, and a new
 * template appears here without shipping a build.
 *
 * Locked templates are shown rather than filtered out — an owner who cannot see
 * what Starter adds has no reason to move up, and hiding them makes Basic look
 * thin instead of deliberately simple.
 */
export function TemplatePicker({
  themeId,
  accent,
  onSelect,
  onAccent,
  onEntitlements,
}: {
  themeId: string;
  accent: string;
  /** Receives the template's suggested accent too, so a Basic plan can follow it. */
  onSelect: (id: string, suggestedAccent: string) => void;
  onAccent: (hex: string) => void;
  /** Lets the parent hide the accent swatches when the plan doesn't allow them. */
  onEntitlements?: (canCustomiseAccent: boolean) => void;
}) {
  const [themes, setThemes] = useState<MenuTheme[]>([]);
  const [canAccent, setCanAccent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.menuThemes();
        if (cancelled) return;
        setThemes(data.themes);
        setCanAccent(data.canCustomiseAccent);
        onEntitlements?.(data.canCustomiseAccent);
      } catch {
        // Offline or a stale session. Say so rather than rendering an empty
        // gap under the "Template" heading, which reads as a broken screen.
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (themes.length === 0) {
    return (
      <Text style={styles.planNote}>
        {failed
          ? "Couldn't load the templates just now. Check your connection and reopen this screen — your menu is unchanged."
          : "No templates available."}
      </Text>
    );
  }

  const selected = themes.find((t) => t.id === themeId);

  const groups: { tone: "dark" | "light"; label: string }[] = [
    { tone: "dark", label: "Dark" },
    { tone: "light", label: "Light" },
  ];

  return (
    <View>
      {groups.map((g) => {
        const list = themes.filter((t) => t.tone === g.tone);
        if (list.length === 0) return null;
        return (
          <View key={g.tone} style={{ marginBottom: 6 }}>
            <Text style={styles.group}>{g.label.toUpperCase()}</Text>
            {list.map((t) => {
              const active = t.id === themeId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => !t.locked && onSelect(t.id, t.suggestedAccent)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: t.locked }}
                  accessibilityLabel={
                    t.locked ? `${t.label}, available on Starter` : t.label
                  }
                  style={[
                    styles.row,
                    active && { borderColor: colors.accent },
                    t.locked && { opacity: 0.55 },
                  ]}
                >
                  {/*
                    A miniature menu row, not a colour chip: every dark
                    template's background is within a few percent of the others,
                    so plain squares all look identical. The text and accent are
                    what actually tell them apart.
                  */}
                  <View style={[styles.swatch, { backgroundColor: t.palette.bg }]}>
                    <View style={[styles.bar, { backgroundColor: t.palette.text, width: "78%" }]} />
                    <View style={[styles.bar, { backgroundColor: t.palette.dim, width: "48%" }]} />
                    <View
                      style={[
                        styles.bar,
                        { backgroundColor: t.suggestedAccent, width: "32%", height: 5 },
                      ]}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.name, active && { color: colors.accent }]}>
                        {t.label}
                      </Text>
                      {t.display === "serif" ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>SERIF</Text>
                        </View>
                      ) : null}
                      {t.locked ? (
                        <View style={[styles.badge, styles.lockBadge]}>
                          <Text style={[styles.badgeText, { color: colors.accent }]}>STARTER</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.note}>{t.note}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      {!canAccent ? (
        <Text style={styles.planNote}>
          On Basic your menu uses the colours that come with each template — they&apos;re chosen to
          stay readable in a dim room. Starter unlocks the styled templates and your own accent
          colour.
        </Text>
      ) : selected && accent.toLowerCase() !== selected.suggestedAccent.toLowerCase() ? (
        <Pressable
          onPress={() => onAccent(selected.suggestedAccent)}
          style={styles.suggest}
          accessibilityRole="button"
        >
          <View style={[styles.dot, { backgroundColor: selected.suggestedAccent }]} />
          <Text style={styles.suggestText}>Use the accent that suits {selected.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 24, alignItems: "center" },
  group: {
    color: colors.textFaint,
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 7,
  },
  bar: { height: 3, borderRadius: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { color: colors.text, fontFamily: font.bold, fontSize: 15 },
  badge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  lockBadge: { borderColor: "rgba(240,118,46,0.4)", backgroundColor: "rgba(240,118,46,0.14)" },
  badgeText: { color: colors.textFaint, fontFamily: font.bold, fontSize: 9, letterSpacing: 0.6 },
  note: { color: colors.textDim, fontFamily: font.regular, fontSize: 12.5, marginTop: 2 },
  planNote: {
    color: colors.textDim,
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 18,
    borderWidth: 1,
    borderColor: "rgba(240,118,46,0.3)",
    backgroundColor: "rgba(240,118,46,0.06)",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 4,
  },
  suggest: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  suggestText: { color: colors.accent, fontFamily: font.semibold, fontSize: 13 },
});
