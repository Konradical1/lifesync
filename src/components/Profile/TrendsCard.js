import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import { useTheme } from '../../store/ThemeContext';

function TrendItem({ icon, iconColor, label, value }) {
  const { palette, text } = useTheme();
  return (
    <View style={styles.item}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.itemText}>
        <Text style={text.subheadline}>{label}</Text>
        <Text style={[text.subheadline, { color: palette.secondaryLabel }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function TrendsCard({ events, moodEntries, journal }) {
  const { palette, text, shape } = useTheme();
  const today = new Date();
  const todayStr = formatDate(today);

  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(formatDate(d));
  }

  const loggingDays = new Set();
  (events || []).forEach((e) => {
    if (last7Days.includes(e.date)) loggingDays.add(e.date);
  });
  (journal || []).forEach((j) => {
    if (last7Days.includes(j.date)) loggingDays.add(j.date);
  });
  const streak = loggingDays.size;

  const sleepEvents = (events || []).filter(
    (e) => e.type === 'sleep' && last7Days.includes(e.date)
  );
  const sleepCount = sleepEvents.length;

  const recentMoods = (moodEntries || []).filter((m) =>
    last7Days.includes(m.date)
  );
  const moodCount = recentMoods.length;

  const hasData = streak > 0 || sleepCount > 0 || moodCount > 0;
  if (!hasData) return null;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, borderCurve: shape.borderCurve },
        ]}
      >
        <Text style={[text.eyebrow, styles.sectionLabel]}>
          {'This Week'.toUpperCase()}
        </Text>
        <View style={styles.grid}>
          {streak > 0 && (
            <TrendItem
              icon="flame-outline"
              iconColor={EVENT_TYPE_COLORS.exercise}
              label="Logging streak"
              value={`${streak} of 7 days`}
            />
          )}
          {sleepCount > 0 && (
            <TrendItem
              icon="moon-outline"
              iconColor={EVENT_TYPE_COLORS.sleep}
              label="Sleep logged"
              value={`${sleepCount} night${sleepCount !== 1 ? 's' : ''}`}
            />
          )}
          {moodCount > 0 && (
            <TrendItem
              icon="happy-outline"
              iconColor={EVENT_TYPE_COLORS.meds}
              label="Mood check-ins"
              value={`${moodCount} entr${moodCount !== 1 ? 'ies' : 'y'}`}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
