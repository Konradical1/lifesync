import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useEvents, useStore } from "../store/useStore";
import DayView from "../components/Calendar/DayView";
import EventEditSheet from "../components/Calendar/EventEditSheet";
import MoodEditSheet from "../components/Calendar/MoodEditSheet";
import { colors, spacing, typography } from "../theme/constants";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
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

  const mode = route.params?.mode ?? "events";
  const isMoodMode = mode === "mood";

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [dates] = useState(() => generateDatesAround(new Date()));
  const [initialIndex, setInitialIndex] = useState(
    Math.floor(dates.length / 2),
  );
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
    [dates],
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
      navigation.setParams({
        focusDate: undefined,
        focusEventId: undefined,
        focusMoodId: undefined,
      });
    }
  }, [
    routeFocusDate,
    routeFocusEventId,
    routeFocusMoodId,
    dates,
    events,
    moodEntries,
    navigation,
  ]);

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
        <View
          style={[styles.dayPage, { width: Dimensions.get("window").width }]}
        >
          <View style={styles.dayHeader}>
            <View style={styles.dateCluster}>
              <Text style={styles.monthYear}>
                {d.toLocaleString("default", { month: "long" })}{" "}
                {d.getFullYear()}
              </Text>
              <View style={styles.dayTitleRow}>
                <Text style={styles.dayName}>{dayName}</Text>
                <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                  {dayNum}
                </Text>
              </View>
            </View>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                onPress={() => navigation.setParams({ mode: "events" })}
                style={[
                  styles.modeOption,
                  !isMoodMode && styles.modeOptionActive,
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={!isMoodMode ? colors.background : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabelText,
                    !isMoodMode && styles.modeLabelTextActive,
                  ]}
                >
                  Events
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.setParams({ mode: "mood" })}
                style={[
                  styles.modeOption,
                  isMoodMode && styles.modeOptionActive,
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="happy-outline"
                  size={15}
                  color={isMoodMode ? colors.background : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabelText,
                    isMoodMode && styles.modeLabelTextActive,
                  ]}
                >
                  Mood
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.timelineShell}>
            <DayView
              date={date}
              events={events}
              moodEntries={moodEntries}
              mode={mode}
              onEventPress={handleEventPress}
              onMoodPress={handleMoodPress}
              focusedEventId={
                !isMoodMode && date === focusDate ? focusEventId : null
              }
              focusedMoodId={
                isMoodMode && date === focusDate ? focusMoodId : null
              }
              onFocusedEventScrolled={handleFocusedEventScrolled}
              onFocusedMoodScrolled={handleFocusedMoodScrolled}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onEventMovedToDay={handleEventMovedToDay}
              onMoodMovedToDay={handleEventMovedToDay}
            />
          </View>
        </View>
      );
    },
    [
      events,
      moodEntries,
      mode,
      isMoodMode,
      handleEventPress,
      handleMoodPress,
      focusDate,
      focusEventId,
      focusMoodId,
      handleFocusedEventScrolled,
      handleFocusedMoodScrolled,
      handleDragStart,
      handleDragEnd,
      handleEventMovedToDay,
    ],
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: Dimensions.get("window").width,
      offset: Dimensions.get("window").width * index,
      index,
    }),
    [],
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
        <EventEditSheet event={selectedEvent} onClose={handleCloseSheet} />
      )}
      {selectedMood && (
        <MoodEditSheet mood={selectedMood} onClose={handleCloseSheet} />
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
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  weekLabel: {
    ...typography.caption1,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textSecondary,
  },
  dayPage: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  dateCluster: {
    flex: 1,
  },
  dayTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  dayName: {
    fontSize: typography.title3.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
  },
  dayNum: {
    fontSize: 48,
    lineHeight: 54,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  dayNumToday: {
    color: colors.accent,
  },
  monthYear: {
    ...typography.footnote,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textTertiary,
  },
  modeSwitch: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  modeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
  },
  modeOptionActive: {
    backgroundColor: colors.accent,
  },
  modeLabelText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  modeLabelTextActive: {
    color: colors.background,
  },
  timelineShell: {
    flex: 1,
    minHeight: 1,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.045)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
