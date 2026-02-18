import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore, useEvents, useLatestInsight } from '../store/useStore';
import { getInsights } from '../api/ai';
import InsightCard from '../components/Insights/InsightCard';
import { colors, spacing, typography } from '../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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
  const moods = dates.map((date) => {
    const entries = state.moodEntries.filter((m) => m.date === date);
    if (entries.length === 0) return null;
    const latest = entries.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
    return { date, emotion: latest.emotion, intensity: latest.intensity };
  }).filter((m) => m && (m.emotion || m.intensity));

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const hasAutoFetchedNewDay = useRef(false);

  const fetchInsights = () => {
    setAiError(null);
    setAiLoading(true);
    getInsights({ events: recentEvents, journal: recentJournal, moods })
      .then((result) => {
        if (result.ok) {
          dispatch({
            type: 'ADD_INSIGHTS_ENTRY',
            payload: {
              id: 'insight_' + Date.now(),
              date: today,
              text: result.insights,
              createdAt: new Date().toISOString(),
            },
          });
        } else {
          setAiError(result.error || 'Could not load insights');
        }
      })
      .finally(() => setAiLoading(false));
  };

  // Regenerate only on a new day: if we have a saved insight from a previous day, auto-fetch once
  useEffect(() => {
    if (hasAutoFetchedNewDay.current) return;
    const hasData = recentEvents.length > 0 || recentJournal.length > 0 || moods.length > 0;
    if (!hasData) return;
    const isNewDay = latestInsight && latestInsight.date !== today;
    if (isNewDay) {
      hasAutoFetchedNewDay.current = true;
      fetchInsights();
    }
  }, [latestInsight?.date, today]);

  const todayEvents = events.filter((e) => e.date === today);
  const sleepCount = events.filter((e) => e.type === 'sleep').length;
  const foodCount = events.filter((e) => e.type === 'food').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Text style={styles.backLink} onPress={() => navigation.goBack()}>
            ← Back
          </Text>
        ) : (
          <View style={{ width: 50 }} />
        )}
        <Text style={styles.title}>Insights</Text>
        <View style={{ width: 50 }} />
      </View>
      <View style={styles.aiSection}>
        <Text style={styles.sectionTitle}>AI insights</Text>
        {aiLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.loadingText}>Generating insights…</Text>
          </View>
        )}
        {aiError && (
          <Text style={styles.errorText}>{aiError}</Text>
        )}
        {latestInsight?.text && !aiLoading && (
          <>
            <InsightCard title="From your recent data" body={latestInsight.text} formatted />
            <Text style={styles.generatedLabel}>
              Generated {latestInsight.date === today ? 'today' : latestInsight.date}
            </Text>
          </>
        )}
        {!latestInsight?.text && !aiLoading && !aiError && recentEvents.length === 0 && recentJournal.length === 0 && moods.length === 0 && (
          <Text style={styles.hint}>Log events, journal, and moods to see AI insights.</Text>
        )}
        {!latestInsight?.text && !aiLoading && !aiError && (recentEvents.length > 0 || recentJournal.length > 0 || moods.length > 0) && (
          <Text style={styles.hint}>Tap Refresh to generate your first insights.</Text>
        )}
        {!aiLoading && (
          <TouchableOpacity style={styles.refreshButton} onPress={fetchInsights}>
            <Text style={styles.refreshButtonText}>{latestInsight?.text ? 'Refresh insights' : 'Generate insights'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <InsightCard
        title="Today at a glance"
        body={`You logged ${todayEvents.length} events today. ${todayEvents.length > 0 ? 'Keep up the consistency — small steps add up.' : 'Start logging to see insights.'}`}
        highlight={todayEvents.length > 0 ? 'Keep up the consistency' : 'Start logging'}
      />
      <InsightCard
        title="Sleep patterns"
        body={sleepCount === 0
          ? 'Log your sleep to see patterns and trends here.'
          : `You have logged ${sleepCount} sleep ${sleepCount === 1 ? 'entry' : 'entries'}. Regular sleep tracking helps identify trends.`}
        highlight={sleepCount > 0 ? 'Regular sleep tracking' : 'Log your sleep'}
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
            <View key={i} style={[styles.bar, { height: h, backgroundColor: colors.accent }]} />
          ))}
        </View>
        <Text style={styles.chartLabel}>Mon Tue Wed Thu Fri Sat Sun</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  title: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    color: colors.textPrimary,
  },
  chartPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
  },
  chartTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
    textAlign: 'center',
  },
  aiSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  loadingText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
    fontStyle: 'italic',
  },
  generatedLabel: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  refreshButtonText: {
    fontSize: typography.footnote.fontSize,
    color: colors.accent,
  },
});
