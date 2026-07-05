import React, { useCallback, useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import DraggableEventBlock from "./DraggableEventBlock";
import DraggableMoodBlock from "./DraggableMoodBlock";
import { useStore } from "../../store/useStore";
import { EVENT_TYPES } from "../../store/mockData";
import {
  formatTime12h,
  getEventStartAndDuration,
  getEventEndMinutes,
  getSleepSegmentForDay,
  getMoodStartAndEnd,
} from "../../utils/time";
import { useTheme } from "../../store/ThemeContext";

const HOUR_HEIGHT = 72;
const MIN_EVENT_HEIGHT = 44;
const THIN_EVENT_THRESHOLD = 56;

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMinutesFromMidnight(now) {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

function formatHourLabel(h) {
  const time24 = `${String(h % 24).padStart(2, "0")}:00`;
  return formatTime12h(time24);
}

function getEventLayout(event) {
  const { startMinutes, durationMinutes } = getEventStartAndDuration(event);
  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max(
    (durationMinutes / 60) * HOUR_HEIGHT,
    MIN_EVENT_HEIGHT,
  );
  return {
    top,
    height,
    startMinutes,
    endMinutes: startMinutes + durationMinutes,
  };
}

/**
 * Get mood display items for a day.
 */
function getMoodDisplayItemsForDay(moodEntries, date) {
  const HOUR_HEIGHT = 72;
  const MIN_HEIGHT = 44;
  const items = moodEntries
    .filter((m) => m.date === date)
    .map((mood) => {
      const { startMinutes, endMinutes } = getMoodStartAndEnd(mood);
      const top = (startMinutes / 60) * HOUR_HEIGHT;
      const durationMinutes = endMinutes - startMinutes;
      const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_HEIGHT);
      return { mood, top, height, startMinutes, endMinutes };
    });
  return items.sort((a, b) => a.startMinutes - b.startMinutes);
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
        const height = Math.max(
          ((seg.endMinutes - seg.startMinutes) / 60) * HOUR_HEIGHT,
          MIN_EVENT_HEIGHT,
        );
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

function computeOverlapColumns(items) {
  const result = {};
  const sorted = [...items].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes)
      return a.startMinutes - b.startMinutes;
    return (b.endMinutes ?? 0) - (a.endMinutes ?? 0);
  });

  const clusters = [];
  let cluster = [];
  let clusterEnd = -1;

  sorted.forEach((item) => {
    if (cluster.length === 0 || item.startMinutes < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMinutes ?? item.startMinutes);
      return;
    }

    clusters.push(cluster);
    cluster = [item];
    clusterEnd = item.endMinutes ?? item.startMinutes;
  });

  if (cluster.length > 0) clusters.push(cluster);

  clusters.forEach((group) => {
    const columnEnds = [];
    const assignments = [];

    group.forEach((item) => {
      let columnIndex = columnEnds.findIndex((end) => end <= item.startMinutes);
      if (columnIndex === -1) {
        columnIndex = columnEnds.length;
        columnEnds.push(item.endMinutes);
      } else {
        columnEnds[columnIndex] = item.endMinutes;
      }
      assignments.push({ item, columnIndex });
    });

    const totalColumns = Math.max(1, columnEnds.length);
    assignments.forEach(({ item, columnIndex }) => {
      result[item.event.id] = { columnIndex, totalColumns };
    });
  });

  return result;
}

export default function DayView({
  date,
  events,
  moodEntries,
  mode = "events",
  onEventPress,
  onMoodPress,
  focusedEventId,
  focusedMoodId,
  onFocusedEventScrolled,
  onFocusedMoodScrolled,
  onDragStart,
  onDragEnd,
  onEventMovedToDay,
  onMoodMovedToDay,
}) {
  const { dispatch } = useStore();
  const { palette, text } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const scrollRef = useRef(null);
  const hasScrolledToCurrentTimeRef = useRef(false);
  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  const isToday = date === getTodayString();
  const nowLineTop = isToday
    ? (getMinutesFromMidnight(new Date()) / 60) * HOUR_HEIGHT + 6
    : null;

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNowTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, [isToday]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStart?.();
  }, [onDragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  const isMoodMode = mode === "mood";
  const displayItems = isMoodMode
    ? getMoodDisplayItemsForDay(moodEntries ?? [], date)
    : getDisplayItemsForDay(events ?? [], date);

  const focusedId = isMoodMode ? focusedMoodId : focusedEventId;

  useEffect(() => {
    if (!focusedId) return;
    const item = displayItems.find((it) =>
      isMoodMode ? it.mood?.id === focusedId : it.event?.id === focusedId,
    );
    if (!item) return;
    const { top } = item;
    const offsetY = Math.max(0, top - 80);
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offsetY, animated: true });
      onFocusedEventScrolled?.();
      onFocusedMoodScrolled?.();
    }, 100);
    return () => clearTimeout(id);
  }, [
    focusedId,
    date,
    displayItems,
    isMoodMode,
    onFocusedEventScrolled,
    onFocusedMoodScrolled,
  ]);

  // Reset "scrolled to current time" when leaving today so we scroll once when coming back
  useEffect(() => {
    if (!isToday) hasScrolledToCurrentTimeRef.current = false;
  }, [isToday]);

  // When opening day view for today with no focused item, scroll to current time (once only, not while dragging)
  useEffect(() => {
    if (
      !isToday ||
      focusedId ||
      nowLineTop == null ||
      isDragging ||
      hasScrolledToCurrentTimeRef.current
    )
      return;
    const offsetY = Math.max(0, nowLineTop - 80);
    const id = setTimeout(() => {
      if (isDraggingRef.current) return;
      hasScrolledToCurrentTimeRef.current = true;
      scrollRef.current?.scrollTo({ y: offsetY, animated: true });
    }, 150);
    return () => clearTimeout(id);
  }, [date, isToday, focusedId, nowLineTop, isDragging]);

  const handleTimeChange = useCallback(
    (updatedEvent) => {
      dispatch({ type: "UPDATE_EVENT", payload: updatedEvent });
    },
    [dispatch],
  );

  const handleMoodChange = useCallback(
    (updatedMood) => {
      dispatch({ type: "UPDATE_MOOD", payload: updatedMood });
    },
    [dispatch],
  );

  const handleEventMovedToDay = useCallback(
    (newDate) => {
      onEventMovedToDay?.(newDate);
    },
    [onEventMovedToDay],
  );

  const handleMoodMovedToDay = useCallback(
    (newDate) => {
      onMoodMovedToDay?.(newDate);
    },
    [onMoodMovedToDay],
  );

  const overlapMap = isMoodMode ? {} : computeOverlapColumns(displayItems);
  const maxEndMinutes = displayItems.reduce(
    (max, it) => Math.max(max, it.endMinutes ?? 0),
    24 * 60,
  );

  const gridHeight = Math.max(
    24 * HOUR_HEIGHT,
    (maxEndMinutes / 60) * HOUR_HEIGHT,
  );
  const hourCount = Math.ceil(maxEndMinutes / 60);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!isDragging}
    >
      <View style={styles.grid}>
        {Array.from({ length: hourCount }, (_, i) => (
          <View key={i} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <Text
              style={[
                text.caption,
                styles.hourLabel,
                { color: palette.tertiaryLabel },
              ]}
            >
              {formatHourLabel(i)}
            </Text>
            <View
              style={[styles.hourLine, { borderTopColor: palette.separator }]}
            />
          </View>
        ))}
      </View>
      <View style={[styles.eventsColumn, { height: gridHeight }]}>
        <View
          style={[styles.hourLinesBackdrop, { height: gridHeight }]}
          pointerEvents="none"
        >
          {Array.from({ length: hourCount }, (_, i) => (
            <View
              key={i}
              style={[
                styles.hourLineFaint,
                { top: i * HOUR_HEIGHT, borderTopColor: palette.separator },
              ]}
            />
          ))}
        </View>
        {isMoodMode
          ? displayItems.map((item) => {
              const { mood, top, height } = item;
              return (
                <DraggableMoodBlock
                  key={mood.id}
                  mood={mood}
                  top={top}
                  height={height}
                  onPress={onMoodPress}
                  onMoodChange={handleMoodChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  viewDate={date}
                  onMoodMovedToDay={handleMoodMovedToDay}
                />
              );
            })
          : displayItems.map((item) => {
              const { event, top, height } = item;
              const key =
                item.isSleepSegment && item.endMinutes < 480
                  ? `${event.id}-am`
                  : event.id;
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
        {isToday && nowLineTop != null && (
          <View
            style={[styles.nowLineWrap, { top: nowLineTop }]}
            pointerEvents="none"
          >
            <View style={[styles.nowDot, { backgroundColor: palette.red }]} />
            <View style={[styles.nowLine, { backgroundColor: palette.red }]} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  grid: {
    width: 50,
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourLabel: {
    width: 46,
    textAlign: "right",
    paddingRight: 8,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  eventsColumn: {
    flex: 1,
    marginLeft: 12,
    position: "relative",
  },
  hourLinesBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  hourLineFaint: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
    marginTop: 6,
  },
  nowLineWrap: {
    position: "absolute",
    left: -5,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  nowDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  nowLine: {
    flex: 1,
    height: 2,
  },
});
