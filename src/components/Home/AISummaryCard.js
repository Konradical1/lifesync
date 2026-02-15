import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useStore, useSummary, useLatestSummary, useEvents, useJournal, useMood } from '../../store/useStore';
import { getDaySummary } from '../../api/ai';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AISummaryCard() {
  const today = formatDateKey(new Date());
  const summaryToday = useSummary(today);
  const latestSummary = useLatestSummary(today);
  const storedEntry = summaryToday ?? latestSummary;
  const summary = storedEntry && typeof storedEntry === 'object' && storedEntry.text
    ? storedEntry.text
    : (storedEntry || null);
  const events = useEvents(today);
  const journal = useJournal(today);
  const mood = useMood(today);
  const { dispatch } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    if (summaryToday?.text) return;
    const hasData = events.length > 0 || journal.length > 0 || (mood && (mood.emotion || mood.intensity));
    if (!hasData) return;
    fetchedRef.current = true;
    setLoading(true);
    getDaySummary({
      date: today,
      events,
      journal,
      mood: mood || null,
    })
      .then((result) => {
        if (result.ok && result.summary) {
          dispatch({ type: 'SET_SUMMARY', payload: { date: today, text: result.summary } });
        }
      })
      .finally(() => setLoading(false));
    // Run once when we have data for today and no summary yet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const handleRefresh = () => {
    setLoading(true);
    getDaySummary({
      date: today,
      events,
      journal,
      mood: mood || null,
    })
      .then((result) => {
        if (result.ok && result.summary) {
          dispatch({ type: 'SET_SUMMARY', payload: { date: today, text: result.summary } });
        }
      })
      .finally(() => setLoading(false));
  };

  if (loading && !summary) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Generating day summary…</Text>
      </View>
    );
  }

  const fullText = summary ?? 'No data yet — start logging your day';
  const highlight = summary ? (summary.includes('balanced') ? 'balanced' : summary.includes('track') ? 'on track' : '') : 'start logging';
  const parts = highlight ? fullText.split(highlight) : [fullText];

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[styles.card, expanded && styles.cardExpanded]}
      >
        <Text style={styles.text} numberOfLines={expanded ? undefined : 2}>
          {parts[0]}
          {parts.length > 1 ? <Text style={styles.highlight}>{highlight}</Text> : null}
          {parts[1] ?? ''}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={styles.refreshButtonText}>Refresh</Text>
        )}
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
    fontSize: typography.callout.fontSize,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  highlight: {
    color: colors.accent,
    fontWeight: '600',
  },
  refreshButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    minWidth: 64,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: typography.footnote.fontSize,
    color: colors.accent,
    fontWeight: '500',
  },
});
