import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStore, useLatestInsight } from "../store/useStore";
import { getInsights } from "../api/ai";
import InsightCard from "../components/Insights/InsightCard";
import Card from "../components/ui/Card";
import { LiquidGlass } from "../components/ui/LiquidGlass";
import { useTheme } from "../store/ThemeContext";

const SCREEN_MARGIN = 20;
const REFRESH_ANIMATION_MS = 700;
const REFRESH_BUTTON_SIZE = 40;
const DAYS_BACK = 7;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLast7Days() {
  const out = [];
  for (let i = 0; i < DAYS_BACK; i++) {
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

/** Centered letterspaced-caps section divider (same pattern as Home). */
function SectionHeader({ title }) {
  const { text } = useTheme();
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={text.eyebrow}>{title.toUpperCase()}</Text>
    </View>
  );
}

/** One small count tile in the week grid: eyebrow, big number, context line. */
function WeekStat({ label, count, unit, color }) {
  const { text } = useTheme();
  return (
    <Card style={styles.weekStat}>
      <Text style={text.eyebrow}>{label.toUpperCase()}</Text>
      <View style={styles.weekStatValueRow}>
        <Text style={[text.statValue, { color }]}>{count}</Text>
        <Text style={[text.footnote, styles.weekStatUnit]}>{unit}</Text>
      </View>
    </Card>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { palette, text } = useTheme();
  const { state, dispatch } = useStore();
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

  const weekMeals = recentEvents.filter((e) => e.type === "food").length;
  const weekSleep = recentEvents.filter((e) => e.type === "sleep").length;
  const weekMoods = moods.length;
  const weekJournal = recentJournal.length;
  const hasAnyData = weekMeals + weekSleep + weekMoods + weekJournal > 0;

  const insightSections = latestInsight?.text
    ? parseInsightSections(latestInsight.text)
    : [];
  const showPlaceholders = aiLoading || refreshing;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={palette.label}
      progressViewOffset={insets.top + 12}
      colors={Platform.OS === "android" ? [palette.tint] : undefined}
      progressBackgroundColor={
        Platform.OS === "android" ? palette.card : undefined
      }
    />
  );

  const listHeader = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={text.display} accessibilityRole="header">
            insights.
          </Text>
          <Text style={[text.footnote, styles.subtitle]}>
            Patterns from your last 7 days
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Regenerate insights"
          onPress={fetchInsights}
          disabled={aiLoading}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <LiquidGlass interactive style={styles.refreshButton}>
            {aiLoading ? (
              <ActivityIndicator size="small" color={palette.label} />
            ) : (
              <Ionicons name="refresh" size={18} color={palette.label} />
            )}
          </LiquidGlass>
        </Pressable>
      </View>

      <SectionHeader title="This Week" />
      <View style={styles.weekGrid}>
        <WeekStat
          label="Meals"
          count={weekMeals}
          unit="logged"
          color={palette.green}
        />
        <WeekStat
          label="Sleep"
          count={weekSleep}
          unit={weekSleep === 1 ? "night" : "nights"}
          color={palette.indigo}
        />
      </View>
      <View style={[styles.weekGrid, styles.weekGridSecondRow]}>
        <WeekStat
          label="Moods"
          count={weekMoods}
          unit="check-ins"
          color={palette.pink}
        />
        <WeekStat
          label="Journal"
          count={weekJournal}
          unit={weekJournal === 1 ? "entry" : "entries"}
          color={palette.purple}
        />
      </View>

      <SectionHeader title="Weekly Readout" />
      {aiError ? (
        <Text style={[text.footnote, styles.statusText, { color: palette.red }]}>
          {aiError}
        </Text>
      ) : null}
      {showPlaceholders ? (
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
          <Text style={[text.caption, styles.generatedLabel]}>
            {`GENERATED ${latestInsight.date === today ? "TODAY" : latestInsight.date}`}
          </Text>
        </>
      ) : (
        <Text style={[text.footnote, styles.statusText]}>
          {hasAnyData
            ? "Tap refresh to generate your first weekly readout."
            : "Log meals, sleep, moods, or journal entries to unlock insights."}
        </Text>
      )}
    </>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.background }]}>
      <FlatList
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={listHeader}
        refreshControl={refreshControl}
        alwaysBounceVertical
        bounces
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingBottom: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_MARGIN,
    paddingTop: 8,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 4,
  },
  refreshButton: {
    width: REFRESH_BUTTON_SIZE,
    height: REFRESH_BUTTON_SIZE,
    borderRadius: REFRESH_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: SCREEN_MARGIN,
    marginTop: 30,
    marginBottom: 12,
  },
  weekGrid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: SCREEN_MARGIN,
  },
  weekGridSecondRow: {
    marginTop: 12,
  },
  weekStat: {
    flex: 1,
  },
  weekStatValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 6,
  },
  weekStatUnit: {
    marginBottom: 1,
  },
  statusText: {
    textAlign: "center",
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: 12,
  },
  generatedLabel: {
    textAlign: "center",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
