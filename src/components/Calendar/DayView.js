import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import DraggableEventBlock from './DraggableEventBlock';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import {
  formatTime12h,
  getEventStartAndDuration,
  getEventEndMinutes,
  getSleepSegmentForDay,
} from '../../utils/time';
import { colors, spacing, typography } from '../../theme/constants';

const HOUR_HEIGHT = 72;
const MIN_EVENT_HEIGHT = 44;
const THIN_EVENT_THRESHOLD = 56;

function formatHourLabel(h) {
  const time24 = `${String(h % 24).padStart(2, '0')}:00`;
  return formatTime12h(time24);
}

function getEventLayout(event) {
  const { startMinutes, durationMinutes } = getEventStartAndDuration(event);
  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
  return { top, height, startMinutes, endMinutes: startMinutes + durationMinutes };
}

/**
 * Get all display items for a day, including overnight sleep on both start and end days.
 */
function getDisplayItemsForDay(events, date) {
  const items = [];
  events.forEach((event) => {
    if (event.type === EVENT_TYPES.sleep && event.startTime && event.endTime) {
      const seg = getSleepSegmentForDay(event, date);
      if (seg) {
        const top = (seg.startMinutes / 60) * HOUR_HEIGHT;
        const height = Math.max(((seg.endMinutes - seg.startMinutes) / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
        items.push({
          event,
          top,
          height,
          startMinutes: seg.startMinutes,
          endMinutes: seg.endMinutes,
          isSleepSegment: true,
        });
      }
      return;
    }
    if (event.date === date) {
      const layout = getEventLayout(event);
      items.push({
        event,
        ...layout,
        isSleepSegment: false,
      });
    }
  });
  return items.sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Assign column index for overlapping events (Apple-style horizontal stacking).
 * Only overlapping events share width; non-overlapping events use full width.
 * Returns { eventId -> { columnIndex, totalColumns } }.
 */
function computeOverlapColumns(items) {
  const layout = items.map((it) => ({
    event: it.event,
    startMinutes: it.startMinutes,
    endMinutes: it.endMinutes,
  }));
  const result = {};
  const columnsEnd = [];

  layout.forEach(({ event, startMinutes, endMinutes }) => {
    let col = 0;
    while (col < columnsEnd.length && columnsEnd[col] > startMinutes) {
      col++;
    }
    if (col === columnsEnd.length) {
      columnsEnd.push(endMinutes);
    } else {
      columnsEnd[col] = endMinutes;
    }
    const overlappingCount = layout.filter(
      ({ startMinutes: s, endMinutes: e }) => s < endMinutes && e > startMinutes
    ).length;
    result[event.id] = {
      columnIndex: col,
      totalColumns: overlappingCount,
    };
  });

  return result;
}

export default function DayView({
  date,
  events,
  onEventPress,
  focusedEventId,
  onFocusedEventScrolled,
  onDragStart,
  onDragEnd,
  onEventMovedToDay,
}) {
  const { dispatch } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef(null);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStart?.();
  }, [onDragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  useEffect(() => {
    if (!focusedEventId) return;
    const item = getDisplayItemsForDay(events, date).find((it) => it.event.id === focusedEventId);
    if (!item) return;
    const { top } = item;
    const offsetY = Math.max(0, top - 80);
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offsetY, animated: true });
      onFocusedEventScrolled?.();
    }, 100);
    return () => clearTimeout(id);
  }, [focusedEventId, date, events, onFocusedEventScrolled]);

  const handleTimeChange = useCallback(
    (updatedEvent) => {
      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    },
    [dispatch]
  );

  const handleEventMovedToDay = useCallback(
    (newDate) => {
      onEventMovedToDay?.(newDate);
    },
    [onEventMovedToDay]
  );

  const displayItems = getDisplayItemsForDay(events, date);

  const overlapMap = computeOverlapColumns(displayItems);
  const maxEndMinutes = displayItems.reduce((max, it) => Math.max(max, it.endMinutes), 24 * 60);

  const gridHeight = Math.max(24 * HOUR_HEIGHT, (maxEndMinutes / 60) * HOUR_HEIGHT);
  const hourCount = Math.ceil(maxEndMinutes / 60);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl }]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!isDragging}
    >
      <View style={styles.grid}>
        {Array.from({ length: hourCount }, (_, i) => (
          <View key={i} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={styles.hourLabel}>{formatHourLabel(i)}</Text>
            <View style={styles.hourLine} />
          </View>
        ))}
      </View>
      <View style={[styles.eventsColumn, { height: gridHeight }]}>
        <View style={[styles.hourLinesBackdrop, { height: gridHeight }]} pointerEvents="none">
          {Array.from({ length: hourCount }, (_, i) => (
            <View
              key={i}
              style={[styles.hourLineFaint, { top: i * HOUR_HEIGHT }]}
            />
          ))}
        </View>
        {displayItems.map((item, idx) => {
          const { event, top, height } = item;
          const key = item.isSleepSegment && item.endMinutes < 480
            ? `${event.id}-am` : event.id;
          const { columnIndex, totalColumns } = overlapMap[event.id] ?? {
            columnIndex: 0,
            totalColumns: 1,
          };
          return (
            <DraggableEventBlock
              key={key}
              event={event}
              top={top}
              height={height}
              columnIndex={columnIndex}
              totalColumns={totalColumns}
              onPress={onEventPress}
              onTimeChange={handleTimeChange}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              viewDate={date}
              onEventMovedToDay={handleEventMovedToDay}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
  },
  grid: {
    width: 52,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    width: 44,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 6,
  },
  eventsColumn: {
    flex: 1,
    marginLeft: spacing.xs,
    position: 'relative',
  },
  hourLinesBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  hourLineFaint: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(110, 118, 129, 0.25)',
    marginTop: 6,
  },
});
