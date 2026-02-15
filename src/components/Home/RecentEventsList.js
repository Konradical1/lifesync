import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRecentEvents } from '../../store/useStore';
import { EVENT_ICON_NAMES, EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { EVENT_TYPE_COLORS } from '../../theme/constants';

function getEventDescription(event) {
  switch (event.type) {
    case EVENT_TYPES.sleep:
      return `${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`;
    case EVENT_TYPES.food:
      return event.description ?? 'Food logged';
    case EVENT_TYPES.exercise:
      return `${event.description ?? 'Exercise'} · ${event.duration || 0} min`;
    case EVENT_TYPES.meds:
      return `${event.name} · ${event.dosage}${event.unit ?? 'mg'}`;
    case EVENT_TYPES.other:
      return event.note ?? 'Note';
    default:
      return 'Event';
  }
}

export default function RecentEventsList() {
  const events = useRecentEvents(3);
  const navigation = useNavigation();

  const handlePress = (event) => {
    navigation.navigate('CalendarTab', {
      screen: 'Calendar',
      params: { focusDate: event.date, focusEventId: event.id },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent <Text style={styles.sectionTitleHighlight}>Events</Text></Text>
      {events.map((event) => {
        const eventColor = EVENT_TYPE_COLORS[event.type] ?? colors.accent;
        return (
        <TouchableOpacity
          key={event.id}
          onPress={() => handlePress(event)}
          style={[styles.card, { borderLeftColor: eventColor }]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={EVENT_ICON_NAMES[event.type] ?? 'document-text-outline'}
            size={22}
            color={eventColor}
            style={styles.icon}
          />
          <View style={styles.content}>
            <Text style={[styles.time, { color: eventColor }]}>{formatTime12h(event.time ?? event.startTime)}</Text>
            <Text style={styles.description} numberOfLines={1}>
              {getEventDescription(event)}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sectionTitleHighlight: {
    color: colors.accent,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderLeftWidth: 4,
  },
  icon: {
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: typography.caption1.fontSize,
    marginBottom: 2,
  },
  description: {
    fontSize: typography.subhead.fontSize,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    color: colors.textTertiary,
  },
});
