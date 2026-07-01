import React, { useState, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { ConfettiProvider } from "../components/ConfettiProvider";
import Header from "../components/Home/Header";
import AISummaryCard from "../components/Home/AISummaryCard";
import MoodSelector from "../components/Home/MoodSelector";
import JournalEntry from "../components/Home/JournalEntry";
import CalorieProteinGoals from "../components/Home/CalorieProteinGoals";
import WaterTracker from "../components/Home/WaterTracker";
import RecentEventsList from "../components/Home/RecentEventsList";
import { colors, spacing, typography } from "../theme/constants";

const REFRESH_ANIMATION_MS = 700;
const SCREEN_MARGIN = spacing.md;

const quickActions = [
  {
    key: "food",
    label: "Food",
    icon: "restaurant-outline",
    tint: colors.eventFood,
    route: { name: "AddEventTab", params: { screen: "FoodEvent" } },
  },
  {
    key: "water",
    label: "Water",
    icon: "water-outline",
    tint: colors.water,
    route: { name: "WaterHistory" },
  },
  {
    key: "journal",
    label: "Journal",
    icon: "pencil-outline",
    tint: colors.eventMeds,
    route: { name: "JournalHistory" },
  },
  {
    key: "sleep",
    label: "Sleep",
    icon: "moon-outline",
    tint: colors.eventSleep,
    route: { name: "AddEventTab", params: { screen: "SleepEvent" } },
  },
];

function AmbientBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <Defs>
          <RadialGradient id="topGlow" cx="12%" cy="0%" r="72%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.22" />
            <Stop offset="42%" stopColor={colors.water} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sideGlow" cx="95%" cy="22%" r="58%">
            <Stop offset="0%" stopColor={colors.eventMeds} stopOpacity="0.13" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#topGlow)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#sideGlow)" />
      </Svg>
    </View>
  );
}

function SectionLabel({ eyebrow, title }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function QuickActions({ navigation }) {
  return (
    <View style={styles.quickActions}>
      {quickActions.map((action) => (
        <TouchableOpacity
          key={action.key}
          activeOpacity={0.82}
          style={styles.quickAction}
          onPress={() =>
            navigation.navigate(action.route.name, action.route.params)
          }
        >
          <View
            style={[
              styles.quickActionIcon,
              { backgroundColor: action.tint + "22" },
            ]}
          >
            <Ionicons name={action.icon} size={19} color={action.tint} />
          </View>
          <Text style={styles.quickActionText} numberOfLines={1}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const navigation = useNavigation();
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
      tintColor={colors.accent}
      title="Refreshing"
      titleColor={colors.textSecondary}
      colors={Platform.OS === "android" ? [colors.accent] : undefined}
      progressViewOffset={Platform.OS === "android" ? 0 : undefined}
      progressBackgroundColor={
        Platform.OS === "android" ? colors.surface : undefined
      }
    />
  );

  const listHeader = (
    <>
      <View style={styles.titleBlock}>
        <Text style={styles.dateLabel}>{formatToday()}</Text>
        <Text style={styles.title}>Today</Text>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroEyebrow}>Daily Brief</Text>
            <Text style={styles.heroTitle}>A clear read on today.</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
          </View>
        </View>
        <AISummaryCard
          refreshing={refreshing}
          onFetchDone={onFetchDone}
          onLoadingChange={onLoadingChange}
          animTrigger={animTrigger}
        />
      </View>

      <QuickActions navigation={navigation} />

      <SectionLabel eyebrow="Now" title="Mood" />
      <MoodSelector refreshTrigger={animTrigger} loading={summaryLoading} />

      <SectionLabel eyebrow="Vitals" title="Nutrition and hydration" />
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("AddEventTab", { screen: "FoodEvent" })
        }
      >
        <CalorieProteinGoals
          animTrigger={animTrigger}
          loading={summaryLoading}
        />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("WaterHistory")}
      >
        <WaterTracker refreshTrigger={refreshKey} loading={summaryLoading} />
      </TouchableOpacity>

      <SectionLabel eyebrow="Reflect" title="Journal" />
      <JournalEntry />

      <SectionLabel eyebrow="Timeline" title="Recent activity" />
      <RecentEventsList />
    </>
  );

  return (
    <ConfettiProvider>
      <View style={styles.wrapper}>
        <AmbientBackdrop />
        <Header />
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.content}
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  titleBlock: {
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: spacing.xl,
  },
  dateLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  title: {
    marginTop: 2,
    fontSize: 42,
    lineHeight: 48,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  heroPanel: {
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.055)",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.22,
        shadowRadius: 30,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  heroEyebrow: {
    ...typography.caption1,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  heroTitle: {
    marginTop: spacing.xxs,
    fontSize: typography.title3.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(88,166,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(88,166,255,0.22)",
  },
  quickActions: {
    flexDirection: "row",
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: spacing.lg,
    padding: spacing.xs,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: spacing.xs,
  },
  quickAction: {
    flex: 1,
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(13,17,23,0.46)",
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  quickActionText: {
    ...typography.caption1,
    color: colors.textPrimary,
  },
  sectionLabel: {
    marginHorizontal: SCREEN_MARGIN,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionEyebrow: {
    ...typography.caption2,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: typography.title3.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
});
