import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useConfetti } from "../ConfettiProvider";
import { useStore } from "../../store/useStore";
import { useTodayWaterOz } from "../../store/useStore";
import { getTimeNow24h } from "../../utils/time";
import Card from "../ui/Card";
import StatBar from "./StatBar";
import { useTheme } from "../../store/ThemeContext";
import { SkeletonBar, SkeletonLines } from "./SkeletonText";

const OZ_OPTIONS = [16, 24, 32];
const SCREEN_MARGIN = 20;
const DEFAULT_WATER_GOAL_OZ = 64;
const TICKER_DURATION_MS = 900;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateId() {
  return "w_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

function AnimatedNumberTicker({ value, refreshTrigger, style }) {
  const animatedValue = useSharedValue(value);
  const [display, setDisplay] = useState(value);
  const prevTrigger = useRef(refreshTrigger);

  useEffect(() => {
    const shouldAnimate =
      refreshTrigger != null &&
      refreshTrigger > 0 &&
      refreshTrigger !== prevTrigger.current;
    if (shouldAnimate) {
      prevTrigger.current = refreshTrigger;
      setDisplay(0);
      animatedValue.value = 0;
      const id = requestAnimationFrame(() => {
        animatedValue.value = withTiming(value, {
          duration: TICKER_DURATION_MS,
        });
      });
      return () => cancelAnimationFrame(id);
    } else {
      animatedValue.value = value;
      setDisplay(value);
    }
  }, [value, refreshTrigger]);

  useAnimatedReaction(
    () => animatedValue.value,
    (v) => {
      runOnJS(setDisplay)(Math.round(v));
    },
  );

  return <Text style={style}>{display}</Text>;
}

/** Full-width water tile: stat column on the left, quick-add pills on the right. */
export default function WaterTracker({ refreshTrigger, loading = false }) {
  const { palette, text } = useTheme();
  const { state, dispatch } = useStore();
  const todayOz = useTodayWaterOz();
  const profile = state.profile || {};
  const waterGoal = parseInt(profile.waterGoalOz, 10) || DEFAULT_WATER_GOAL_OZ;
  const fireConfetti = useConfetti();

  const progress = waterGoal > 0 ? Math.min(1, todayOz / waterGoal) : 0;
  const percent = Math.round(progress * 100);

  const handleAdd = useCallback(
    (oz) => (e) => {
      const { pageX, pageY } = e?.nativeEvent ?? {};
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const today = formatDateKey(new Date());
      dispatch({
        type: "ADD_WATER_ENTRY",
        payload: {
          id: generateId(),
          date: today,
          time: getTimeNow24h(),
          oz,
          createdAt: new Date().toISOString(),
        },
      });
      if (typeof pageX === "number" && typeof pageY === "number") {
        fireConfetti.fire(pageX, pageY);
      }
    },
    [dispatch, fireConfetti],
  );

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.statColumn}>
            <SkeletonBar width="40%" />
            <SkeletonLines widths={["70%", "100%"]} gap={12} />
          </View>
          <View style={styles.buttonColumn}>
            <SkeletonLines widths={["100%", "100%", "100%"]} gap={10} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.statColumn}>
          <Text style={text.eyebrow}>WATER</Text>
          <Text style={[text.caption, styles.percentLine, { color: palette.cyan }]}>
            {`${percent}% OF GOAL`}
          </Text>
          <View style={styles.valueRow}>
            <AnimatedNumberTicker
              value={todayOz}
              refreshTrigger={refreshTrigger}
              style={text.statValue}
            />
            <Text style={[text.footnote, styles.unit]}>oz</Text>
          </View>
          <Text style={text.footnote}>{`of ${waterGoal} oz`}</Text>
          <View style={styles.barWrap}>
            <StatBar
              progress={progress}
              color={palette.cyan}
              animTrigger={refreshTrigger}
            />
          </View>
        </View>
        <View style={styles.buttonColumn}>
          {OZ_OPTIONS.map((oz) => (
            <Pressable
              key={oz}
              accessibilityRole="button"
              accessibilityLabel={`Add ${oz} ounces of water`}
              onPress={handleAdd(oz)}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: palette.fill },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[text.subheadline, { color: palette.cyan }]}>
                +{oz} oz
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SCREEN_MARGIN,
  },
  row: {
    flexDirection: "row",
    gap: 20,
  },
  statColumn: {
    flex: 1.4,
    minWidth: 0,
  },
  percentLine: {
    marginTop: 10,
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 2,
  },
  unit: {
    marginBottom: 1,
  },
  barWrap: {
    marginTop: 10,
  },
  buttonColumn: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  addButton: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
