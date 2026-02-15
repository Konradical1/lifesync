import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useEvents } from '../store/useStore';
import InsightCard from '../components/Insights/InsightCard';
import { colors, spacing, typography } from '../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const events = useEvents();

  const today = formatDateKey(new Date());
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
        <Text style={styles.backLink} onPress={() => navigation.goBack()}>
          ← Back
        </Text>
        <Text style={styles.title}>Insights</Text>
        <View style={{ width: 50 }} />
      </View>
      <InsightCard
        title="Today at a glance"
        body={`You logged ${todayEvents.length} events today. ${todayEvents.length > 0 ? 'Keep up the consistency — small steps add up.' : 'Start logging to see insights.'}`}
        highlight={todayEvents.length > 0 ? 'Keep up the consistency' : 'Start logging'}
      />
      <InsightCard
        title="Sleep patterns"
        body={`You have logged ${sleepCount} sleep entries. Regular sleep tracking helps identify trends.`}
        highlight="Regular sleep tracking"
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
});
