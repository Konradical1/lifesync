import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useStore, useEvents, useLatestInsight } from "../store/useStore";
import { getInsights } from "../api/ai";
import InsightCard from "../components/Insights/InsightCard";
import { colors, spacing, typography } from "../theme/constants";

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLast7Days() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(formatDateKey(d));
  }
  return out;
}

/** Placeholder section definitions shown while insights are loading. */
const PLACEHOLDER_SECTIONS = [
  { title: "Sleep", iconName: "sleep" },
  { title: "Meals", iconName: "nutrition" },
  { title: "Mood", iconName: "mood" },
  { title: "Activity", iconName: "exercise" },
  { title: "Moving forward", iconName: "progress" },
];

/** Parse AI insight text into sections by ## [icon:name] Title. Returns [{ title, body, iconName }]. */
function parseInsightSections(text) {
  if (!text || !text.trim()) return [];
  const sections = [];
  const parts = text.split(/\n(?=##\s+\[icon:)/i);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const firstNewline = trimmed.indexOf("\n");
    const firstLine =
      firstNewline >= 0 ? trimmed.slice(0, firstNewline) : trimmed;
    const body =
      firstNewline >= 0 ? trimmed.slice(firstNewline + 1).trim() : "";
    const m = firstLine.match(/^##\s+\[icon:\s*(\w+)\]\s*(.+)$/i);
    if (m)
      sections.push({
        title: m[2].trim(),
        body,
        iconName: m[1].trim().toLowerCase(),
      });
  }
  return sections;
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { state, dispatch } = useStore();
  const events = useEvents();
  const latestInsight = useLatestInsight();
  const today = formatDateKey(new Date());
  const dates = getLast7Days();
  const recentEvents = state.events.filter((e) => dates.includes(e.date));
  const recentJournal = state.journal.filter((j) => dates.includes(j.date));
  const moods = dates
    .map((date) => {
      const entries = state.moodEntries.filter((m) => m.date === date);
      if (entries.length === 0) return null;
      const latest = entries.sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      )[0];
      return { date, emotion: latest.emotion, intensity: latest.intensity };
    })
    .filter((m) => m && (m.emotion || m.intensity));

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasAutoFetchedNewDay = useRef(false);

  const REFRESH_ANIMATION_MS = 700;
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setAnimTrigger((t) => t + 1);
    }, REFRESH_ANIMATION_MS);
  }, []);

  const fetchInsights = () => {
    setAiError(null);
    setAiLoading(true);
    getInsights({
      events: recentEvents,
      journal: recentJournal,
      moods,
      today,
      profile: state.profile,
    })
      .then((result) => {
        if (result.ok) {
          dispatch({
            type: "ADD_INSIGHTS_ENTRY",
            payload: {
              id: "insight_" + Date.now(),
              date: today,
              text: result.insights,
              createdAt: new Date().toISOString(),
            },
          });
          setAnimTrigger((t) => t + 1);
        } else {
          setAiError(result.error || "Could not load insights");
        }
      })
      .finally(() => setAiLoading(false));
  };

  // Regenerate only on a new day: if we have a saved insight from a previous day, auto-fetch once
  useEffect(() => {
    if (hasAutoFetchedNewDay.current) return;
    const hasData =
      recentEvents.length > 0 || recentJournal.length > 0 || moods.length > 0;
    if (!hasData) return;
    const isNewDay = latestInsight && latestInsight.date !== today;
    if (isNewDay) {
      hasAutoFetchedNewDay.current = true;
      fetchInsights();
    }
  }, [latestInsight?.date, today]);

  const todayEvents = events.filter((e) => e.date === today);
  const sleepCount = events.filter((e) => e.type === "sleep").length;
  const foodCount = events.filter((e) => e.type === "food").length;
  const insightSections = latestInsight?.text
    ? parseInsightSections(latestInsight.text)
    : [];

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      title="Refreshing"
      titleColor={colors.textSecondary}
      colors={Platform.OS === "android" ? [colors.accent] : undefined}
      progressViewOffset={Platform.OS === "android" ? 0 : undefined}
      progressBackgroundColor={
        Platform.OS === "android" ? colors.surface : undefined
      }
    />
  );

  const listHeader = (
    <>
      <View style={styles.aiSection}>
        <View style={styles.aiSectionHeader}>
          <View>
            <Text style={styles.aiLabel}>
              <Text style={styles.aiLabelAccent}>AI</Text> INSIGHTS
            </Text>
            <Text style={styles.aiTitle}>Weekly readout</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshIconButton}
            onPress={fetchInsights}
            disabled={aiLoading}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={22}
                color={colors.accent}
              />
            )}
          </TouchableOpacity>
        </View>
        {aiLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.loadingText}>Generating insights…</Text>
          </View>
        )}
        {aiError && <Text style={styles.errorText}>{aiError}</Text>}
        {aiLoading || refreshing ? (
          PLACEHOLDER_SECTIONS.map((section) => (
            <InsightCard
              key={section.title}
              title={section.title}
              iconName={section.iconName}
              placeholder
              formatted
            />
          ))
        ) : latestInsight?.text ? (
          <>
            {insightSections.length > 0 ? (
              insightSections.map((section, index) => (
                <InsightCard
                  key={section.title}
                  title={section.title}
                  body={section.body}
                  iconName={section.iconName}
                  formatted
                  animTrigger={animTrigger}
                  sectionIndex={index}
                />
              ))
            ) : (
              <InsightCard
                title="From your recent data"
                body={latestInsight.text}
                formatted
              />
            )}
            <Text style={styles.generatedLabel}>
              Generated{" "}
              {latestInsight.date === today ? "today" : latestInsight.date}
            </Text>
          </>
        ) : null}
        {!latestInsight?.text &&
          !aiLoading &&
          !aiError &&
          recentEvents.length === 0 &&
          recentJournal.length === 0 &&
          moods.length === 0 && (
            <Text style={styles.hint}>
              Log events, journal, and moods to see AI insights.
            </Text>
          )}
        {!latestInsight?.text &&
          !aiLoading &&
          !aiError &&
          (recentEvents.length > 0 ||
            recentJournal.length > 0 ||
            moods.length > 0) && (
            <Text style={styles.hint}>
              Tap the refresh icon to generate your first insights.
            </Text>
          )}
      </View>
      <InsightCard
        title="Today at a glance"
        body={`You logged ${todayEvents.length} events today. ${todayEvents.length > 0 ? "Keep up the consistency — small steps add up." : "Start logging to see insights."}`}
        highlight={
          todayEvents.length > 0 ? "Keep up the consistency" : "Start logging"
        }
      />
      <InsightCard
        title="Sleep patterns"
        body={
          sleepCount === 0
            ? "Log your sleep to see patterns and trends here."
            : `You have logged ${sleepCount} sleep ${sleepCount === 1 ? "entry" : "entries"}. Regular sleep tracking helps identify trends.`
        }
        highlight={sleepCount > 0 ? "Regular sleep tracking" : "Log your sleep"}
      />
      <InsightCard
        title="Nutrition"
        body={`${foodCount} meals logged. Tracking food supports awareness.`}
        highlight="supports awareness"
      />
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartTitle}>Weekly activity</Text>
        <View style={styles.barChart}>
          {[60, 80, 45, 90, 70, 85, 40].map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: h, backgroundColor: colors.accent },
              ]}
            />
          ))}
        </View>
        <Text style={styles.chartLabel}>Mon Tue Wed Thu Fri Sat Sun</Text>
      </View>
    </>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.accent} />
            <Text style={styles.backLink}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.eyebrow}>Patterns</Text>
          <Text style={styles.title}>Insights</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={listHeader}
        refreshControl={refreshControl}
        alwaysBounceVertical={true}
        bounces={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 140,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -6,
    marginBottom: spacing.sm,
  },
  backPlaceholder: {
    height: spacing.lg,
  },
  backLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  headerTitleWrap: {
    alignSelf: "stretch",
  },
  eyebrow: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: "uppercase",
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  chartPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 24,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chartTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
    gap: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
    minHeight: 8,
  },
  chartLabel: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  aiSection: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 28,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  aiSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  aiLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  aiTitle: {
    marginTop: 2,
    fontSize: typography.title3.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  aiLabelAccent: {
    color: colors.accent,
    fontFamily: typography.fontFamilySemiBold,
  },
  refreshIconButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadingText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  generatedLabel: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});
