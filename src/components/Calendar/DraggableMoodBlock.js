import React, { useRef, useCallback, useEffect } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import MoodCard from './MoodCard';
import {
  getMoodStartAndEnd,
  minutesToTime24,
  rawMinutesToDateAndTime,
  toAbsoluteSlots,
  fromAbsoluteSlots,
} from '../../utils/time';
import { MOOD_OPTIONS } from '../../store/mockData';
import { useTheme } from '../../store/ThemeContext';

const HOUR_HEIGHT = 72;
const HOLD_DURATION_MS = 350;
const MIN_HEIGHT = 44;

function buildMoodWithNewStartTime(mood, newDate, newStartMinutes) {
  const { startMinutes, endMinutes } = getMoodStartAndEnd(mood);
  const durationMinutes = endMinutes - startMinutes;
  const newEndMinutes = newStartMinutes + durationMinutes;
  return {
    ...mood,
    date: newDate,
    startTime: minutesToTime24(newStartMinutes),
    endTime: minutesToTime24(newEndMinutes),
  };
}

export default function DraggableMoodBlock({
  mood,
  top,
  height,
  onPress,
  onMoodChange,
  onDragStart,
  onDragEnd,
  viewDate,
  onMoodMovedToDay,
}) {
  const { palette } = useTheme();
  const dragActivated = useRef(false);
  const holdTimerRef = useRef(null);
  const { startMinutes } = getMoodStartAndEnd(mood);
  const lastSnapped = useRef({ date: mood.date, minutes: startMinutes });
  const gestureStartMinutes = useRef(startMinutes);
  const moodRef = useRef(mood);
  const onPressRef = useRef(onPress);
  const onMoodChangeRef = useRef(onMoodChange);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const viewDateRef = useRef(viewDate);
  const onMoodMovedToDayRef = useRef(onMoodMovedToDay);
  moodRef.current = mood;
  viewDateRef.current = viewDate;
  onMoodMovedToDayRef.current = onMoodMovedToDay;
  onPressRef.current = onPress;
  onMoodChangeRef.current = onMoodChange;
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
        const m = moodRef.current;
        const { startMinutes: sm } = getMoodStartAndEnd(m);
        gestureStartMinutes.current = sm;
        lastSnapped.current = { date: m.date, minutes: sm };
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          dragActivated.current = true;
          onDragStartRef.current?.();
        }, HOLD_DURATION_MS);
      },
      onPanResponderMove: (_, { dy }) => {
        if (!dragActivated.current) return;

        const m = moodRef.current;
        const baseMinutes = gestureStartMinutes.current;
        const deltaMinutes = (dy / HOUR_HEIGHT) * 60;
        const rawMinutes = baseMinutes + deltaMinutes;
        const { date: newDate, minutes: newMinutes } = rawMinutesToDateAndTime(m.date, rawMinutes);
        const last = lastSnapped.current;

        if (newDate === last.date && newMinutes === last.minutes) return;

        const refDate = m.date;
        const lastSlots = toAbsoluteSlots(refDate, last.date, last.minutes);
        const newSlots = toAbsoluteSlots(refDate, newDate, newMinutes);
        const step = newSlots > lastSlots ? 1 : -1;
        for (let s = lastSlots + step; step > 0 ? s <= newSlots : s >= newSlots; s += step) {
          const { date: d, minutes: mins } = fromAbsoluteSlots(refDate, s);
          lastSnapped.current = { date: d, minutes: mins };
          triggerHaptic();
          const updated = buildMoodWithNewStartTime(moodRef.current, d, mins);
          onMoodChangeRef.current?.(updated);
          if (d !== viewDateRef.current) {
            onMoodMovedToDayRef.current?.(d);
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
          onPressRef.current?.(moodRef.current);
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

  const moodColor = MOOD_OPTIONS.find((m) => m.id === mood.emotion)?.color ?? palette.tint;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.block,
        {
          top,
          height,
          borderLeftColor: moodColor,
        },
      ]}
    >
      <MoodCard mood={mood} compact horizontal showBar={false} fillHeight />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 6,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
});
