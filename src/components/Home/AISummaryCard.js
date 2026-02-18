import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, ActivityIndicator, Animated } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useStore, useSummary, useLatestSummary, useEvents, useJournal, useMood } from '../../store/useStore';
import { getDaySummaryShort } from '../../api/ai';
import { colors, spacing, typography } from '../../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AISummaryCard({ refreshTrigger = 0 }) {
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
  const { state, dispatch } = useStore();
  const profile = state.profile || {};
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const lastRefreshTriggerRef = useRef(refreshTrigger);
  const textOpacity = useRef(new Animated.Value(summary ? 1 : 0)).current;
  const prevSummaryRef = useRef(summary);

  // Initial fetch when we have data and no summary yet
  useEffect(() => {
    if (fetchedRef.current) return;
    if (summaryToday?.text) return;
    const hasData = events.length > 0 || journal.length > 0 || (mood && (mood.emotion || mood.intensity));
    if (!hasData) return;
    fetchedRef.current = true;
    setLoading(true);
    getDaySummaryShort({
      date: today,
      events,
      journal,
      mood: mood || null,
      profile,
    })
      .then((result) => {
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
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull-to-refresh: generate new summary and save previous
  useEffect(() => {
    if (refreshTrigger === 0 || refreshTrigger === lastRefreshTriggerRef.current) return;
    lastRefreshTriggerRef.current = refreshTrigger;
    setLoading(true);
    getDaySummaryShort({
      date: today,
      events,
      journal,
      mood: mood || null,
      profile,
    })
      .then((result) => {
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
      })
      .finally(() => setLoading(false));
  }, [refreshTrigger, today, events, journal, mood, profile, dispatch]);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  // Fade in text when summary appears or updates (e.g. after refresh)
  useEffect(() => {
    if (!summary) return;
    if (prevSummaryRef.current !== summary) {
      prevSummaryRef.current = summary;
      textOpacity.setValue(0);
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else if (prevSummaryRef.current === undefined) {
      prevSummaryRef.current = summary;
      textOpacity.setValue(0);
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [summary, textOpacity]);

  if (loading && !summary) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Generating day summary…</Text>
      </View>
    );
  }

  const fullText = summary ?? 'No data yet — start logging your day';
  const highlight = highlightedWord && fullText.includes(highlightedWord)
    ? highlightedWord
    : (summary && (summary.includes('balanced') ? 'balanced' : summary.includes('track') ? 'on track' : '')) || '';
  const parts = highlight ? fullText.split(highlight) : [fullText];

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[styles.card, expanded && styles.cardExpanded]}
      >
        <Animated.Text style={[styles.text, { opacity: textOpacity }]} numberOfLines={expanded ? undefined : 3}>
          {parts[0]}
          {parts.length > 1 ? <Text style={styles.highlight}>{highlight}</Text> : null}
          {parts[1] ?? ''}
        </Animated.Text>
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
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderWidth: 0,
  },
  cardExpanded: {},
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  loadingText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  text: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.fontFamilyMedium,
    fontStyle: 'italic',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  highlight: {
    color: colors.accent,
    fontFamily: typography.fontFamilySemiBold,
    fontStyle: 'italic',
  },
  inlineLoader: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
});
