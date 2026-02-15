import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useEvents, useStore } from '../store/useStore';
import DayView from '../components/Calendar/DayView';
import EventEditSheet from '../components/Calendar/EventEditSheet';
import MoodEditSheet from '../components/Calendar/MoodEditSheet';
import { colors, spacing, typography } from '../theme/constants';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function generateDatesAround(center, count = 30) {
  const dates = [];
  const start = new Date(center);
  start.setDate(start.getDate() - Math.floor(count / 2));
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDateKey(d));
  }
  return dates;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const events = useEvents();
  const { state } = useStore();
  const moodEntries = state.moodEntries;
  const flatListRef = useRef(null);

  const mode = route.params?.mode ?? 'events';
  const isMoodMode = mode === 'mood';

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [dates] = useState(() => generateDatesAround(new Date()));
  const [initialIndex, setInitialIndex] = useState(Math.floor(dates.length / 2));
  const [focusDate, setFocusDate] = useState(null);
  const [focusEventId, setFocusEventId] = useState(null);
  const [focusMoodId, setFocusMoodId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => setIsDragging(true), []);
  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  const handleEventMovedToDay = useCallback(
    (newDate) => {
      if (dates.includes(newDate)) {
        const idx = dates.indexOf(newDate);
        flatListRef.current?.scrollToIndex({ index: idx, animated: true });
      }
    },
    [dates]
  );

  const routeFocusDate = route.params?.focusDate;
  const routeFocusEventId = route.params?.focusEventId;
  const routeFocusMoodId = route.params?.focusMoodId;

  useEffect(() => {
    if (routeFocusDate && dates.includes(routeFocusDate)) {
      const idx = dates.indexOf(routeFocusDate);
      setInitialIndex(idx);
      setFocusDate(routeFocusDate);
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      if (routeFocusEventId) {
        setFocusEventId(routeFocusEventId);
        const ev = events.find((e) => e.id === routeFocusEventId);
        if (ev) setSelectedEvent(ev);
      }
      if (routeFocusMoodId) {
        setFocusMoodId(routeFocusMoodId);
        const m = moodEntries.find((mo) => mo.id === routeFocusMoodId);
        if (m) setSelectedMood(m);
      }
      navigation.setParams({ focusDate: undefined, focusEventId: undefined, focusMoodId: undefined });
    }
  }, [routeFocusDate, routeFocusEventId, routeFocusMoodId, dates, events, moodEntries, navigation]);

  const handleEventPress = useCallback((event) => {
    setSelectedEvent(event);
    setSelectedMood(null);
  }, []);

  const handleMoodPress = useCallback((mood) => {
    setSelectedMood(mood);
    setSelectedEvent(null);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedEvent(null);
    setSelectedMood(null);
  }, []);

  const handleFocusedEventScrolled = useCallback(() => {
    setFocusEventId(null);
    setFocusDate(null);
  }, []);

  const handleFocusedMoodScrolled = useCallback(() => {
    setFocusMoodId(null);
    setFocusDate(null);
  }, []);

  const renderDay = useCallback(
    ({ item: date }) => {
      const d = getDateFromKey(date);
      const dayName = DAY_LABELS[d.getDay()];
      const dayNum = d.getDate();
      const isToday = date === formatDateKey(new Date());

      return (
        <View style={[styles.dayPage, { width: Dimensions.get('window').width }]}>
          <View style={styles.dayHeader}>
            <View>
              <Text style={styles.dayName}>{dayName}</Text>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
              <Text style={styles.monthYear}>
                {d.toLocaleString('default', { month: 'long' })} {d.getFullYear()}
              </Text>
            </View>
            {isMoodMode ? (
              <TouchableOpacity
                onPress={() => navigation.setParams({ mode: 'events' })}
                style={styles.modeLabel}
              >
                <Text style={styles.modeLabelText}>← Events</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => navigation.setParams({ mode: 'mood' })}
                style={styles.modeLabel}
              >
                <Text style={styles.modeLabelText}>Mood</Text>
              </TouchableOpacity>
            )}
          </View>
          <DayView
            date={date}
            events={events}
            moodEntries={moodEntries}
            mode={mode}
            onEventPress={handleEventPress}
            onMoodPress={handleMoodPress}
            focusedEventId={!isMoodMode && date === focusDate ? focusEventId : null}
            focusedMoodId={isMoodMode && date === focusDate ? focusMoodId : null}
            onFocusedEventScrolled={handleFocusedEventScrolled}
            onFocusedMoodScrolled={handleFocusedMoodScrolled}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onEventMovedToDay={handleEventMovedToDay}
            onMoodMovedToDay={handleEventMovedToDay}
          />
        </View>
      );
    },
    [events, moodEntries, mode, isMoodMode, handleEventPress, handleMoodPress, focusDate, focusEventId, focusMoodId, handleFocusedEventScrolled, handleFocusedMoodScrolled, handleDragStart, handleDragEnd, handleEventMovedToDay]
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: Dimensions.get('window').width,
      offset: Dimensions.get('window').width * index,
      index,
    }),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.weekRow}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={styles.weekLabel}>
            {d.charAt(0)}
          </Text>
        ))}
      </View>
      <FlatList
        ref={flatListRef}
        data={dates}
        renderItem={renderDay}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        scrollEnabled={!isDragging}
      />
      {selectedEvent && (
        <EventEditSheet
          event={selectedEvent}
          onClose={handleCloseSheet}
        />
      )}
      {selectedMood && (
        <MoodEditSheet
          mood={selectedMood}
          onClose={handleCloseSheet}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekLabel: {
    fontSize: typography.caption1.fontSize,
    color: colors.textSecondary,
  },
  dayPage: {
    paddingHorizontal: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  dayName: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  dayNum: {
    fontSize: typography.largeTitle.fontSize,
    fontWeight: typography.largeTitle.fontWeight,
    color: colors.textPrimary,
  },
  dayNumToday: {
    color: colors.accent,
  },
  monthYear: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
  },
  modeLabel: {
    marginTop: 4,
  },
  modeLabelText: {
    fontSize: typography.caption1.fontSize,
    color: colors.accent,
  },
});
