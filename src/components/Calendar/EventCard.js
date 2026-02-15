import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_ICON_NAMES, EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { colors, typography } from '../../theme/constants';

function getEventDescription(event) {
  switch (event.type) {
    case EVENT_TYPES.sleep:
      return `${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`;
    case EVENT_TYPES.food:
      return event.description ?? `${event.calories || 0} cal`;
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

function getEventTimeRange(event) {
  if (event.type === EVENT_TYPES.sleep && event.startTime && event.endTime) {
    return `${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`;
  }
  const t = event.time ?? event.startTime;
  return t ? formatTime12h(t) : '';
}

export default function EventCard({
  event,
  onPress,
  color = colors.accent,
  compact = false,
  horizontal = false,
  pressable = true,
}) {
  const eventColor = color;

  if (compact) {
    const desc = getEventDescription(event);
    const Wrapper = pressable ? TouchableOpacity : View;
    return (
      <Wrapper
        style={[compactStyles.card, horizontal && compactStyles.cardHorizontal]}
        onPress={pressable ? () => onPress(event) : undefined}
        activeOpacity={pressable ? 0.8 : undefined}
      >
        <View style={[compactStyles.inner, horizontal && compactStyles.innerHorizontal]}>
          {horizontal ? (
            <>
              <Ionicons
                name={EVENT_ICON_NAMES[event.type] ?? 'document-text-outline'}
                size={16}
                color={eventColor}
                style={compactStyles.iconInline}
              />
              <Text style={compactStyles.desc} numberOfLines={1} ellipsizeMode="tail">
                {event.type === EVENT_TYPES.sleep ? 'Sleep' : desc}
              </Text>
              <Text style={[compactStyles.timeInline, { color: eventColor }]}>
                {getEventTimeRange(event)}
              </Text>
            </>
          ) : (
            <>
              <Text style={[compactStyles.time, { color: eventColor }]}>
                {formatTime12h(event.time ?? event.startTime)}
              </Text>
              <Ionicons
                name={EVENT_ICON_NAMES[event.type] ?? 'document-text-outline'}
                size={16}
                color={eventColor}
              />
              <Text style={compactStyles.desc} numberOfLines={2}>
                {desc}
              </Text>
            </>
          )}
        </View>
      </Wrapper>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(event)} activeOpacity={0.8}>
      <View style={[styles.bar, { backgroundColor: eventColor }]} />
      <View style={styles.content}>
        <Text style={[styles.time, { color: eventColor }]}>
          {formatTime12h(event.time ?? event.startTime)}
        </Text>
        <Ionicons
          name={EVENT_ICON_NAMES[event.type] ?? 'document-text-outline'}
          size={18}
          color={eventColor}
          style={styles.icon}
        />
        <Text style={styles.description} numberOfLines={1}>
          {getEventDescription(event)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bar: {
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  time: {
    fontSize: typography.caption1.fontSize,
    width: 48,
  },
  icon: {
    marginRight: 6,
  },
  description: {
    flex: 1,
    fontSize: typography.caption1.fontSize,
    color: colors.textPrimary,
  },
});

const compactStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    marginHorizontal: 2,
    marginVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardHorizontal: {
    marginVertical: 2,
  },
  inner: {
    flex: 1,
    padding: 10,
  },
  innerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    marginBottom: 2,
  },
  timeInline: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  iconInline: {
    marginRight: 6,
  },
  desc: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
});
