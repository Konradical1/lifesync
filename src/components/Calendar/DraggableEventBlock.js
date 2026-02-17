import React, { useRef, useCallback, useEffect } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import EventCard from './EventCard';
import {
  getEventStartAndDuration,
  minutesToTime24,
  rawMinutesToDateAndTime,
  toAbsoluteSlots,
  fromAbsoluteSlots,
} from '../../utils/time';
import { EVENT_TYPES } from '../../store/mockData';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import { colors } from '../../theme/constants';

const HOUR_HEIGHT = 72;
const HOLD_DURATION_MS = 350;

function buildEventWithNewStartTime(event, newDate, newStartMinutes) {
  const { durationMinutes } = getEventStartAndDuration(event);

  if (event.type === EVENT_TYPES.sleep) {
    const endMinutes = (newStartMinutes + durationMinutes) % (24 * 60);
    return {
      ...event,
      date: newDate,
      startTime: minutesToTime24(newStartMinutes),
      endTime: minutesToTime24(endMinutes),
    };
  }

  if (event.type === EVENT_TYPES.other && event.startTime && event.endTime) {
    const endMinutes = (newStartMinutes + durationMinutes) % (24 * 60);
    return {
      ...event,
      date: newDate,
      startTime: minutesToTime24(newStartMinutes),
      endTime: minutesToTime24(endMinutes),
    };
  }

  return {
    ...event,
    date: newDate,
    time: minutesToTime24(newStartMinutes),
  };
}

export default function DraggableEventBlock({
  event,
  top,
  height,
  columnIndex,
  totalColumns,
  onPress,
  onTimeChange,
  onDragStart,
  onDragEnd,
  viewDate,
  onEventMovedToDay,
}) {
  const dragActivated = useRef(false);
  const holdTimerRef = useRef(null);
  const lastSnapped = useRef({ date: event.date, minutes: getEventStartAndDuration(event).startMinutes });
  const gestureStartMinutes = useRef(0);
  const eventRef = useRef(event);
  const onPressRef = useRef(onPress);
  const onTimeChangeRef = useRef(onTimeChange);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const viewDateRef = useRef(viewDate);
  const onEventMovedToDayRef = useRef(onEventMovedToDay);
  eventRef.current = event;
  viewDateRef.current = viewDate;
  onEventMovedToDayRef.current = onEventMovedToDay;
  onPressRef.current = onPress;
  onTimeChangeRef.current = onTimeChange;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (dragActivated.current) onDragEndRef.current?.();
    };
  }, []);

  const triggerHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (_) {}
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => !dragActivated.current,
      onPanResponderGrant: () => {
        dragActivated.current = false;
        const ev = eventRef.current;
        gestureStartMinutes.current = getEventStartAndDuration(ev).startMinutes;
        lastSnapped.current = { date: ev.date, minutes: gestureStartMinutes.current };
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          dragActivated.current = true;
          onDragStartRef.current?.();
        }, HOLD_DURATION_MS);
      },
      onPanResponderMove: (_, { dy }) => {
        if (!dragActivated.current) return;

        const ev = eventRef.current;
        const baseMinutes = gestureStartMinutes.current;
        const deltaMinutes = (dy / HOUR_HEIGHT) * 60;
        const rawMinutes = baseMinutes + deltaMinutes;
        const { date: newDate, minutes: newMinutes } = rawMinutesToDateAndTime(ev.date, rawMinutes);
        const last = lastSnapped.current;

        if (newDate === last.date && newMinutes === last.minutes) return;

        // Hit every 15-min snap between last and new (handles fast drags, including cross-day)
        const refDate = ev.date;
        const lastSlots = toAbsoluteSlots(refDate, last.date, last.minutes);
        const newSlots = toAbsoluteSlots(refDate, newDate, newMinutes);
        const step = newSlots > lastSlots ? 1 : -1;
        for (let s = lastSlots + step; step > 0 ? s <= newSlots : s >= newSlots; s += step) {
          const { date: d, minutes: m } = fromAbsoluteSlots(refDate, s);
          lastSnapped.current = { date: d, minutes: m };
          triggerHaptic();
          const updated = buildEventWithNewStartTime(ev, d, m);
          onTimeChangeRef.current?.(updated);
          if (d !== viewDateRef.current) {
            onEventMovedToDayRef.current?.(d);
            onDragEndRef.current?.();
            break;
          }
        }
      },
      onPanResponderRelease: (_, { dy }) => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (dragActivated.current) {
          onDragEndRef.current?.();
        } else {
          onPressRef.current?.(eventRef.current);
        }
      },
      onPanResponderTerminate: () => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (dragActivated.current) {
          onDragEndRef.current?.();
        }
      },
    })
  ).current;

  const eventColor = EVENT_TYPE_COLORS[event.type] ?? colors.accent;
  const isThin = height < 56;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.block,
        {
          top,
          height,
          borderLeftColor: eventColor,
          left: `${(100 * columnIndex) / totalColumns}%`,
          width: `${100 / totalColumns - 1}%`,
          marginRight: 2,
        },
      ]}
    >
      <EventCard
        event={event}
        onPress={() => {}}
        color={eventColor}
        compact
        horizontal={isThin}
        pressable={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: 6,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
});
