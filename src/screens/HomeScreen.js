import React, { useState, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ConfettiProvider } from "../components/ConfettiProvider";
import Header from "../components/Home/Header";
import WeekStrip from "../components/Home/WeekStrip";
import AISummaryCard from "../components/Home/AISummaryCard";
import MoodSelector from "../components/Home/MoodSelector";
import JournalEntry from "../components/Home/JournalEntry";
import CalorieProteinGoals from "../components/Home/CalorieProteinGoals";
import WaterTracker from "../components/Home/WaterTracker";
import RecentEventsList from "../components/Home/RecentEventsList";
import { LiquidGlass, LiquidGlassGroup } from "../components/ui/LiquidGlass";
import { useTheme } from "../store/ThemeContext";

const REFRESH_ANIMATION_MS = 700;
const SCREEN_MARGIN = 20;
const QUICK_ACTION_SIZE = 56;
const TAB_BAR_CLEARANCE = 140;

function getQuickActions(palette) {
  return [
    {
      key: "food",
      label: "Food",
      icon: "restaurant",
      tint: palette.green,
      route: { name: "FoodEvent" },
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
      <WeekStrip />

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

      <SectionHeader title="Nutrition" />
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens food logging"
        onPress={() => navigation.navigate("FoodEvent")}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <CalorieProteinGoals
          animTrigger={animTrigger}
          loading={summaryLoading}
        />
      </Pressable>

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
