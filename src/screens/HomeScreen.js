import React, { useState, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ConfettiProvider } from "../components/ConfettiProvider";
import Header from "../components/Home/Header";
import WeekStrip from "../components/Home/WeekStrip";
import AISummaryCard from "../components/Home/AISummaryCard";
import MoodSelector from "../components/Home/MoodSelector";
import JournalEntry from "../components/Home/JournalEntry";
import TodayNutrition from "../components/Home/TodayNutrition";
import WaterTracker from "../components/Home/WaterTracker";
import RecentEventsList from "../components/Home/RecentEventsList";
import { FoodCapture, DayMeals, shortDay } from "../components/Home/FoodLog";
import { LiquidGlass, LiquidGlassGroup } from "../components/ui/LiquidGlass";
import { useTheme } from "../store/ThemeContext";
import { addDaysToDate, dateKey } from "../utils/time";

const REFRESH_ANIMATION_MS = 700;
const SCREEN_MARGIN = 20;
const QUICK_ACTION_SIZE = 56;
const TAB_BAR_CLEARANCE = 140;
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 500;
const SLIDE_IN = 0.35; // a new day slides in from this fraction of the screen width

function getQuickActions(palette) {
  return [
    {
      key: "exercise",
      label: "Exercise",
      icon: "fitness",
      tint: palette.orange,
      route: { name: "ExerciseEvent" },
    },
    {
      key: "water",
      label: "Water",
      icon: "water",
      tint: palette.cyan,
      route: { name: "WaterHistory" },
    },
    {
      key: "journal",
      label: "Journal",
      icon: "create",
      tint: palette.purple,
      route: { name: "JournalHistory" },
    },
    {
      key: "sleep",
      label: "Sleep",
      icon: "moon",
      tint: palette.indigo,
      route: { name: "SleepEvent" },
    },
  ];
}

/** Centered letterspaced-caps section divider; tappable when onAction is set. */
function SectionHeader({ title, actionLabel, onAction }) {
  const { palette, text } = useTheme();
  const label = <Text style={text.eyebrow}>{title.toUpperCase()}</Text>;

  if (!actionLabel) {
    return (
      <View style={styles.sectionHeader} accessibilityRole="header">
        {label}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${actionLabel}`}
      hitSlop={8}
      onPress={onAction}
      style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
    >
      {label}
      <Ionicons
        name="chevron-forward"
        size={12}
        color={palette.tertiaryLabel}
      />
    </Pressable>
  );
}

function QuickActions({ navigation }) {
  const { palette, text } = useTheme();
  const quickActions = getQuickActions(palette);
  return (
    <LiquidGlassGroup spacing={16} style={styles.quickActions}>
      {quickActions.map((action) => (
        <View key={action.key} style={styles.quickAction}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${action.label.toLowerCase()}`}
            onPress={() =>
              navigation.navigate(action.route.name, action.route.params)
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <LiquidGlass interactive style={styles.quickActionCircle}>
              <Ionicons name={action.icon} size={22} color={action.tint} />
            </LiquidGlass>
          </Pressable>
          <Text style={[text.caption, styles.quickActionLabel]} numberOfLines={1}>
            {action.label.toUpperCase()}
          </Text>
        </View>
      ))}
    </LiquidGlassGroup>
  );
}

/** Week strip + one day's food. Swipe sideways or tap the strip to change day; tomorrow is off limits. */
function FoodDays({ animTrigger, loading }) {
  const { width } = useWindowDimensions();
  const today = dateKey();
  const [picked, setPicked] = useState(null); // null = today, so the view rolls over at midnight
  const day = picked && picked < today ? picked : today;
  const isToday = day === today;
  const x = useSharedValue(0);
  const slideFrom = useRef(0);

  const goTo = useCallback(
    (next) => {
      if (next === day || next > today) {
        x.value = withSpring(0);
        return;
      }
      slideFrom.current = next > day ? 1 : -1;
      Haptics.selectionAsync();
      setPicked(next === today ? null : next);
    },
    [day, today, x]
  );
  const step = useCallback((dir) => goTo(addDaysToDate(day, dir)), [day, goTo]);

  // New day's content slides in from the side it came from.
  useLayoutEffect(() => {
    if (!slideFrom.current) return;
    x.value = slideFrom.current * width * SLIDE_IN;
    x.value = withTiming(0, { duration: 220 });
    slideFrom.current = 0;
  }, [day, width, x]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          // Rubber-band toward the future: there's no tomorrow to show.
          x.value = isToday && e.translationX < 0 ? e.translationX / 4 : e.translationX;
        })
        .onEnd((e) => {
          const dir =
            e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY
              ? 1
              : e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY
                ? -1
                : 0;
          if (!dir || (dir === 1 && isToday)) {
            x.value = withSpring(0);
            return;
          }
          x.value = withTiming(-dir * width, { duration: 160 }, (done) => {
            if (done) runOnJS(step)(dir);
          });
        }),
    [isToday, step, width, x]
  );

  const slideStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.value), [0, width], [1, 0]),
    transform: [{ translateX: x.value }],
  }));

  const title = isToday
    ? "Today's Food"
    : day === addDaysToDate(today, -1)
      ? "Yesterday's Food"
      : shortDay(day);

  return (
    <GestureDetector gesture={pan}>
      <View>
        <WeekStrip day={day} today={today} onSelect={goTo} />
        <SectionHeader
          title={title}
          actionLabel={isToday ? undefined : "Back to today"}
          onAction={() => goTo(today)}
        />
        <Animated.View style={slideStyle}>
          <TodayNutrition date={day} animTrigger={animTrigger} loading={loading} />
          <FoodCapture date={day} />
          <View style={styles.mealsGap} />
          <DayMeals date={day} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const onFetchDone = useCallback(() => {
    setAnimTrigger((k) => k + 1);
  }, []);

  const onLoadingChange = useCallback((loading) => {
    setSummaryLoading(!!loading);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setRefreshKey((k) => k + 1);
      setAnimTrigger((k) => k + 1);
    }, REFRESH_ANIMATION_MS);
  }, []);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={palette.label}
      // Content starts below the notch (paddingTop: insets.top), so push the
      // spinner down the same amount or it hides behind the status bar.
      progressViewOffset={insets.top + 12}
      colors={Platform.OS === "android" ? [palette.tint] : undefined}
      progressBackgroundColor={
        Platform.OS === "android" ? palette.card : undefined
      }
    />
  );

  const listHeader = (
    <>
      <Header />
      <FoodDays animTrigger={animTrigger} loading={summaryLoading} />

      <SectionHeader title="Your Day" />
      <AISummaryCard
        refreshing={refreshing}
        onFetchDone={onFetchDone}
        onLoadingChange={onLoadingChange}
        animTrigger={animTrigger}
      />

      <QuickActions navigation={navigation} />

      <SectionHeader
        title="Mood"
        actionLabel="History"
        onAction={() =>
          navigation.navigate("CalendarTab", {
            screen: "Calendar",
            params: { mode: "mood" },
          })
        }
      />
      <MoodSelector refreshTrigger={animTrigger} loading={summaryLoading} />

      <SectionHeader
        title="Water"
        actionLabel="History"
        onAction={() => navigation.navigate("WaterHistory")}
      />
      <WaterTracker refreshTrigger={refreshKey} loading={summaryLoading} />

      <SectionHeader
        title="Journal"
        actionLabel="History"
        onAction={() => navigation.navigate("JournalHistory")}
      />
      <JournalEntry />

      <SectionHeader title="Recent Activity" />
      <RecentEventsList />
    </>
  );

  return (
    <ConfettiProvider>
      <View style={[styles.wrapper, { backgroundColor: palette.background }]}>
        <FlatList
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 12 },
          ]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={listHeader}
          refreshControl={refreshControl}
          alwaysBounceVertical
          bounces
        />
      </View>
    </ConfettiProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginHorizontal: SCREEN_MARGIN,
    marginTop: 30,
    marginBottom: 12,
  },
  mealsGap: {
    height: 14,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SCREEN_MARGIN + 4,
    marginTop: 20,
  },
  quickAction: {
    alignItems: "center",
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  quickActionCircle: {
    width: QUICK_ACTION_SIZE,
    height: QUICK_ACTION_SIZE,
    borderRadius: QUICK_ACTION_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
});
