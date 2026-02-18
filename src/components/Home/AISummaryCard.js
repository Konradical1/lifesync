import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, ActivityIndicator, Animated } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useStore, useSummary, useLatestSummary, useEvents, useJournal, useMood, useWaterEntries } from '../../store/useStore';
import { getDaySummaryShort } from '../../api/ai';
import { colors, spacing, typography } from '../../theme/constants';

const BLUR_IN_OFFSET = 10;
const BLUR_IN_DURATION = 380;
const BLUR_IN_STAGGER_MS = 42;

const SKELETON_LINE_HEIGHT = 14;
const SKELETON_LINE_WIDTHS = ['100%', '82%', '55%'];

function SkeletonLines() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <View style={skeletonStyles.container}>
      {SKELETON_LINE_WIDTHS.map((w, i) => (
        <Animated.View
          key={i}
          style={[skeletonStyles.line, { width: w, opacity }]}
        />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  line: {
    height: SKELETON_LINE_HEIGHT,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
});

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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
    const chunk = words.slice(i, i + highlightWords.length).join(' ');
    if (chunk === highlight) {
      segments.push({ text: chunk, isHighlight: true });
      i += highlightWords.length - 1;
    } else {
      segments.push({ text: words[i], isHighlight: false });
    }
  }
  return segments;
}

function doFetchSummary({ today, events, journal, mood, waterEntries, profile, dispatch, refresh }) {
  return getDaySummaryShort({
    date: today,
    events,
    journal,
    mood: mood || null,
    waterEntries: waterEntries || [],
    profile,
    refresh: !!refresh,
  }).then((result) => {
    if (result.ok && result.summary) {
      dispatch({
        type: 'SET_SUMMARY',
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

export default function AISummaryCard({ refreshTrigger = 0, onRefreshRef }) {
  const today = formatDateKey(new Date());
  const summaryToday = useSummary(today);
  const latestSummary = useLatestSummary(today);
  const storedEntry = summaryToday ?? latestSummary;
  const summary = storedEntry && typeof storedEntry === 'object' && storedEntry.text
    ? storedEntry.text
    : (storedEntry || null);
  const highlightedWord = (storedEntry && typeof storedEntry === 'object' && storedEntry.highlightedWord)
    ? storedEntry.highlightedWord
    : '';
  const events = useEvents(today);
  const journal = useJournal(today);
  const mood = useMood(today);
  const allWaterEntries = useWaterEntries();
  const waterEntries = useMemo(
    () => (allWaterEntries || []).filter((w) => w.date === today),
    [allWaterEntries, today]
  );
  const { state, dispatch } = useStore();
  const profile = state.profile || {};
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const prevSummaryRef = useRef(summary);
  const [segmentAnims, setSegmentAnims] = useState([]);

  const performRefresh = useCallback(() => {
    setLoading(true);
    doFetchSummary({
      today,
      events,
      journal,
      mood: mood || null,
      waterEntries,
      profile,
      dispatch,
      refresh: true,
    }).finally(() => setLoading(false));
  }, [today, events, journal, mood, waterEntries, profile, dispatch]);

  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = performRefresh;
      return () => { onRefreshRef.current = null; };
    }
  }, [onRefreshRef, performRefresh]);

  // Initial fetch when we have data and no summary yet
  useEffect(() => {
    if (fetchedRef.current) return;
    if (summaryToday?.text) return;
    const hasData =
      events.length > 0 ||
      journal.length > 0 ||
      waterEntries.length > 0 ||
      (mood && (mood.emotion || mood.intensity));
    if (!hasData) return;
    fetchedRef.current = true;
    setLoading(true);
    doFetchSummary({
      today,
      events,
      journal,
      mood: mood || null,
      waterEntries,
      profile,
      dispatch,
      refresh: false,
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const fullText = summary ?? 'No data yet — start logging your day';
  const highlight = highlightedWord && fullText.includes(highlightedWord)
    ? highlightedWord
    : (summary && (summary.includes('balanced') ? 'balanced' : summary.includes('track') ? 'on track' : '')) || '';
  const segments = useMemo(() => getSegments(fullText, highlight), [fullText, highlight]);

  // Blur-in-by-word when summary appears or changes
  useEffect(() => {
    if (!summary || segments.length === 0) return;
    if (prevSummaryRef.current === summary) return;
    prevSummaryRef.current = summary;

    const values = segments.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(BLUR_IN_OFFSET),
    }));
    setSegmentAnims(values);

    const run = () => {
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
    };
    requestAnimationFrame(run);
  }, [summary, segments]);

  if (loading && !summary) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.label}><Text style={styles.labelAccent}>AI</Text> SUMMARY</Text>
          <SkeletonLines />
        </View>
      </View>
    );
  }

  const showBlurIn = segmentAnims.length === segments.length && segmentAnims.length > 0;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[styles.card, expanded && styles.cardExpanded]}
      >
        <Text style={styles.label}><Text style={styles.labelAccent}>AI</Text> SUMMARY</Text>
        {showBlurIn ? (
          <View style={[styles.summaryRow, !expanded && styles.summaryRowCollapsed]}>
            {segments.map((seg, i) => (
              <Animated.Text
                key={`${i}-${seg.text}`}
                style={[
                  styles.text,
                  seg.isHighlight && styles.highlight,
                  {
                    opacity: segmentAnims[i].opacity,
                    transform: [{ translateY: segmentAnims[i].translateY }],
                  },
                ]}
              >
                {seg.text}{i < segments.length - 1 ? ' ' : ''}
              </Animated.Text>
            ))}
          </View>
        ) : (
          <Text style={styles.text} numberOfLines={expanded ? undefined : 3}>
            {fullText}
          </Text>
        )}
        {loading ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    paddingTop: spacing.xs,
  },
  cardExpanded: {},
  label: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  labelAccent: {
    color: colors.accent,
    fontFamily: typography.fontFamilySemiBold,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  loadingText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  summaryRowCollapsed: {
    maxHeight: 26 * 3,
    overflow: 'hidden',
  },
  text: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.fontFamilyMediumItalic,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  highlight: {
    color: colors.accent,
    fontFamily: typography.fontFamilySemiBoldItalic,
  },
  inlineLoader: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
});
