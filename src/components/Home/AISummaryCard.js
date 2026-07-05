import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Animated,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from "@expo/vector-icons";
import {
  useStore,
  useSummary,
  useLatestSummary,
  useEvents,
  useJournal,
  useMood,
  useWaterEntries,
} from "../../store/useStore";
import { getDaySummaryShort } from "../../api/ai";
import Card from "../ui/Card";
import { useTheme } from "../../store/ThemeContext";
import { fonts } from "../../theme/ios";
import { SkeletonLines } from "./SkeletonText";

const BLUR_IN_OFFSET = 10;
const BLUR_IN_DURATION = 380;
const BLUR_IN_STAGGER_MS = 42;
const BODY_LINE_HEIGHT = 24;
const COLLAPSED_LINES = 3;
const EMPTY_SUMMARY_TEXT =
  "Nothing logged yet today. Add a meal, water, or your mood to get a summary.";

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Split fullText into segments (words or phrase); one segment can be the highlighted phrase. */
function getSegments(fullText, highlight) {
  if (!fullText) return [];
  const words = fullText.split(/\s+/).filter(Boolean);
  if (!highlight || !fullText.includes(highlight)) {
    return words.map((text) => ({ text, isHighlight: false }));
  }
  const highlightWords = highlight.split(/\s+/).filter(Boolean);
  const segments = [];
  for (let i = 0; i < words.length; i++) {
    const chunk = words.slice(i, i + highlightWords.length).join(" ");
    if (chunk === highlight) {
      segments.push({ text: chunk, isHighlight: true });
      i += highlightWords.length - 1;
    } else {
      segments.push({ text: words[i], isHighlight: false });
    }
  }
  return segments;
}

function doFetchSummary({
  today,
  events,
  journal,
  mood,
  waterEntries,
  profile,
  dispatch,
  refresh,
}) {
  return getDaySummaryShort({
    date: today,
    events,
    journal,
    mood: mood || null,
    waterEntries: waterEntries || [],
    profile,
    refresh: !!refresh,
    localHour: new Date().getHours(),
  }).then((result) => {
    if (result.ok && result.summary) {
      dispatch({
        type: "SET_SUMMARY",
        payload: {
          date: today,
          text: result.summary,
          highlightedWord: result.highlightedWord,
        },
      });
    }
    return result;
  });
}

function CardHeader({ loading, onRefresh }) {
  const { palette, text } = useTheme();
  return (
    <View style={styles.headerRow}>
      <Text style={text.eyebrow}>DAILY SUMMARY</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh summary"
        onPress={onRefresh}
        disabled={loading}
        hitSlop={12}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.secondaryLabel} />
        ) : (
          <Ionicons name="refresh" size={18} color={palette.secondaryLabel} />
        )}
      </Pressable>
    </View>
  );
}

export default function AISummaryCard({
  refreshing = false,
  onFetchDone,
  onLoadingChange,
  animTrigger = 0,
}) {
  const { palette, text } = useTheme();
  const today = formatDateKey(new Date());
  const summaryToday = useSummary(today);
  const latestSummary = useLatestSummary(today);
  const storedEntry = summaryToday ?? latestSummary;
  const summary =
    storedEntry && typeof storedEntry === "object" && storedEntry.text
      ? storedEntry.text
      : storedEntry || null;
  const highlightedWord =
    storedEntry &&
    typeof storedEntry === "object" &&
    storedEntry.highlightedWord
      ? storedEntry.highlightedWord
      : "";
  const events = useEvents(today);
  const journal = useJournal(today);
  const mood = useMood(today);
  const allWaterEntries = useWaterEntries();
  const waterEntries = useMemo(
    () => (allWaterEntries || []).filter((w) => w.date === today),
    [allWaterEntries, today],
  );
  const { state, dispatch } = useStore();
  const profile = state.profile || {};
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const [segmentAnims, setSegmentAnims] = useState([]);
  const prevAnimTriggerRef = useRef(animTrigger);

  const performRefresh = useCallback(() => {
    setLoading(true);
    onLoadingChange?.(true);
    doFetchSummary({
      today,
      events,
      journal,
      mood: mood || null,
      waterEntries,
      profile,
      dispatch,
      refresh: true,
    })
      .then(() => {
        onFetchDone?.();
      })
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, [
    today,
    events,
    journal,
    mood,
    waterEntries,
    profile,
    dispatch,
    onFetchDone,
    onLoadingChange,
  ]);

  // Initial fetch when we have data and no summary yet; re-runs when store hydrates
  useEffect(() => {
    if (fetchedRef.current) return;
    if (summaryToday?.text) {
      onFetchDone?.();
      fetchedRef.current = true;
      return;
    }
    const hasData =
      events.length > 0 ||
      journal.length > 0 ||
      waterEntries.length > 0 ||
      (mood && (mood.emotion || mood.intensity));
    if (!hasData) return;
    fetchedRef.current = true;
    setLoading(true);
    onLoadingChange?.(true);
    doFetchSummary({
      today,
      events,
      journal,
      mood: mood || null,
      waterEntries,
      profile,
      dispatch,
      refresh: false,
    })
      .then(() => {
        onFetchDone?.();
      })
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, [
    summaryToday?.text,
    events.length,
    journal.length,
    waterEntries.length,
    mood?.emotion,
    mood?.intensity,
    today,
    onFetchDone,
  ]);

  const handleToggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const fullText = summary ?? EMPTY_SUMMARY_TEXT;
  const highlight =
    highlightedWord && fullText.includes(highlightedWord)
      ? highlightedWord
      : "";
  const segments = useMemo(
    () => getSegments(fullText, highlight),
    [fullText, highlight],
  );

  // Staggered word reveal, triggered by animTrigger (same counter as mood/calories)
  useEffect(() => {
    if (animTrigger === 0 || animTrigger === prevAnimTriggerRef.current) return;
    prevAnimTriggerRef.current = animTrigger;
    if (!summary || segments.length === 0) return;

    const values = segments.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(BLUR_IN_OFFSET),
    }));
    setSegmentAnims(values);

    requestAnimationFrame(() => {
      values.forEach((v, i) => {
        Animated.sequence([
          Animated.delay(i * BLUR_IN_STAGGER_MS),
          Animated.parallel([
            Animated.timing(v.opacity, {
              toValue: 1,
              duration: BLUR_IN_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(v.translateY, {
              toValue: 0,
              duration: BLUR_IN_DURATION,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    });
  }, [animTrigger, summary, segments]);

  const showSkeleton = (loading && !summary) || (refreshing && summary);
  if (showSkeleton) {
    return (
      <Card style={styles.card}>
        <CardHeader loading onRefresh={performRefresh} />
        <SkeletonLines />
      </Card>
    );
  }

  const showReveal =
    segmentAnims.length === segments.length && segmentAnims.length > 0;

  return (
    <Card style={styles.card}>
        <CardHeader loading={loading} onRefresh={performRefresh} />
        {showReveal ? (
          <View
            style={[styles.summaryRow, !expanded && styles.summaryCollapsed]}
          >
            {segments.map((seg, i) => (
              <Animated.Text
                key={`${i}-${seg.text}`}
                style={[
                  text.body,
                  styles.body,
                  seg.isHighlight && {
                    color: palette.tint,
                    fontFamily: fonts.bodyMedium,
                  },
                  {
                    opacity: segmentAnims[i].opacity,
                    transform: [{ translateY: segmentAnims[i].translateY }],
                  },
                ]}
              >
                {seg.text}
                {i < segments.length - 1 ? " " : ""}
              </Animated.Text>
            ))}
          </View>
        ) : (
          <Text
            style={[text.body, styles.body]}
            numberOfLines={expanded ? undefined : COLLAPSED_LINES}
            ellipsizeMode="tail"
          >
            {fullText}
          </Text>
        )}
      {summary ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? "Show less of the summary" : "Show more of the summary"
          }
          onPress={handleToggleExpanded}
          hitSlop={8}
          style={({ pressed }) => [
            styles.toggleButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[text.footnote, { color: palette.tint }]}>
            {expanded ? "Show Less" : "Show More"}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  body: {
    lineHeight: BODY_LINE_HEIGHT,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  summaryCollapsed: {
    maxHeight: BODY_LINE_HEIGHT * COLLAPSED_LINES,
    overflow: "hidden",
  },
  toggleButton: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
