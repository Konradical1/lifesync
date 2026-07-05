import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRecentEvents } from '../../store/useStore';
import { EVENT_ICON_NAMES, EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import Card from '../ui/Card';
import { useTheme } from '../../store/ThemeContext';

const RECENT_EVENT_COUNT = 3;
const ICON_BOX_SIZE = 30;

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

function getEventTime(event) {
  if (event.type === EVENT_TYPES.other && event.startTime && event.endTime) {
    return `${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`;
  }
  return formatTime12h(event.time ?? event.startTime);
}

/** iOS inset-grouped list of the latest logged events. */
export default function RecentEventsList() {
  const { palette, text } = useTheme();
  const events = useRecentEvents(RECENT_EVENT_COUNT);
  const navigation = useNavigation();

  const handlePress = (event) => {
    navigation.navigate('CalendarTab', {
      screen: 'Calendar',
      params: { focusDate: event.date, focusEventId: event.id },
    });
  };

  if (!events.length) {
    return (
      <Card style={styles.card}>
        <Text style={[text.footnote, styles.emptyText]}>Nothing logged yet.</Text>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, styles.listCard]}>
      {events.map((event, index) => {
        const eventColor = EVENT_TYPE_COLORS[event.type] ?? palette.tint;
        return (
          <Pressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`${getEventDescription(event)}, ${getEventTime(event)}`}
            onPress={() => handlePress(event)}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: palette.cardElevated },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: eventColor }]}>
              <Ionicons
                name={EVENT_ICON_NAMES[event.type] ?? 'document-text-outline'}
                size={16}
                color="#FFFFFF"
              />
            </View>
            <View
              style={[
                styles.rowContent,
                index < events.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: palette.separator,
                },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[text.subheadline, styles.rowTitle]} numberOfLines={1}>
                  {getEventDescription(event)}
                </Text>
                <Text style={[text.footnote, styles.rowTime]}>{getEventTime(event)}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.tertiaryLabel}
              />
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
  },
  listCard: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {},
  rowTime: {
    marginTop: 1,
  },
});
