import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated as RNAnimated } from "react-native";
import { useStore } from "../../store/useStore";
import { useTodayCaloriesAndProtein } from "../../store/useStore";
import Card from "../ui/Card";
import StatBar from "./StatBar";
import { useTheme } from "../../store/ThemeContext";
import { SkeletonBar } from "./SkeletonText";

const ANIM_DURATION = 800;
const SCREEN_MARGIN = 20;
const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_PROTEIN_GOAL = 120;

function NumberTicker({ value, animTrigger, style }) {
  const animVal = useRef(new RNAnimated.Value(0)).current;
  const [display, setDisplay] = useState(value);
  const prevTriggerRef = useRef(animTrigger);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const isTriggered = animTrigger > 0 && animTrigger !== prevTriggerRef.current;
    if (animTrigger > 0) prevTriggerRef.current = animTrigger;
    const shouldRun = isTriggered || !hasAnimatedRef.current;
    if (!shouldRun) {
      setDisplay(value);
      return;
    }
    hasAnimatedRef.current = true;

    animVal.setValue(0);
    const listener = animVal.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    RNAnimated.timing(animVal, {
      toValue: value,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start(() => {
      setDisplay(value);
    });

    return () => animVal.removeListener(listener);
  }, [animTrigger, value, animVal]);

  return <Text style={style}>{display.toLocaleString()}</Text>;
}

/** One budget-style stat tile: eyebrow, % line, big number, goal, bar. */
function StatCard({ label, value, unit, goal, color, animTrigger, loading }) {
  const { text } = useTheme();
  const progress = goal > 0 ? Math.min(1, value / goal) : 0;
  const percent = Math.round(progress * 100);

  return (
    <Card style={styles.statCard}>
      <Text style={text.eyebrow}>{label.toUpperCase()}</Text>
      {loading ? (
        <View style={styles.skeletonBody}>
          <SkeletonBar width="55%" />
          <SkeletonBar width="80%" />
        </View>
      ) : (
        <>
          <Text style={[text.caption, styles.percentLine, { color }]}>
            {`${percent}% OF GOAL`}
          </Text>
          <View style={styles.valueRow}>
            <NumberTicker
              value={value}
              animTrigger={animTrigger}
              style={text.statValue}
            />
            <Text style={[text.footnote, styles.unit]}>{unit}</Text>
          </View>
          <Text style={text.footnote}>{`of ${goal.toLocaleString()}`}</Text>
          <View style={styles.barWrap}>
            <StatBar progress={progress} color={color} animTrigger={animTrigger} />
          </View>
        </>
      )}
    </Card>
  );
}

/** Two-up grid of calorie and protein tiles with animated bars. */
export default function CalorieProteinGoals({ animTrigger = 0, loading = false }) {
  const { palette } = useTheme();
  const { state } = useStore();
  const { calories, protein } = useTodayCaloriesAndProtein();
  const profile = state.profile || {};
  const calorieGoal = parseInt(profile.calorieGoal, 10) || DEFAULT_CALORIE_GOAL;
  const proteinGoal = parseInt(profile.proteinGoal, 10) || DEFAULT_PROTEIN_GOAL;

  return (
    <View style={styles.grid}>
      <StatCard
        label="Calories"
        value={calories}
        unit="cal"
        goal={calorieGoal}
        color={palette.green}
        animTrigger={animTrigger}
        loading={loading}
      />
      <StatCard
        label="Protein"
        value={protein}
        unit="g"
        goal={proteinGoal}
        color={palette.orange}
        animTrigger={animTrigger}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: SCREEN_MARGIN,
  },
  statCard: {
    flex: 1,
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
  skeletonBody: {
    marginTop: 14,
    gap: 12,
  },
});
