import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated as RNAnimated } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useStore, useDayFood } from "../../store/useStore";
import { getFoodIdea } from "../../api/ai";
import { dateKey, getTimeNow24h } from "../../utils/time";
import Card from "../ui/Card";
import StatBar from "./StatBar";
import { useTheme } from "../../store/ThemeContext";
import { SkeletonBar } from "./SkeletonText";
const { dailyTargets, dayGrade, gapLine } = require("../../utils/nutrition");

const ANIM_DURATION = 800;
const SCREEN_MARGIN = 20;
const GRADE_SIZE = 44;
const IDEA_DEBOUNCE_MS = 1500;
const MACROS = [
  { key: "protein", label: "Protein", color: "orange" },
  { key: "carbs", label: "Carbs", color: "cyan" },
  { key: "fat", label: "Fat", color: "purple" },
  { key: "fiber", label: "Fiber", color: "indigo" },
];
const GRADE_COLORS = { A: "green", B: "green", C: "orange", D: "red", F: "red" };

// Coach ideas by `${date}|${meal count}`, kept for the app session.
const ideaCache = new Map();

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

/** A day's calories, macros, sugar/sodium caps and grade; today also gets a "what to eat next" nudge. */
export default function TodayNutrition({ date, animTrigger = 0, loading = false }) {
  const { palette, text } = useTheme();
  const { state } = useStore();
  const { meals, totals } = useDayFood(date);
  const isToday = date === dateKey();
  const profile = state.profile || {};
  const targets = dailyTargets(profile);
  const now = new Date();
  const grade = dayGrade(meals, targets, {
    goal: profile.goalType,
    hour: isToday ? now.getHours() + now.getMinutes() / 60 : 24,
  });
  const gradeColor = grade ? palette[GRADE_COLORS[grade.letter]] : null;

  const ideaKey = `${date}|${meals.length}`;
  const [idea, setIdea] = useState(null);
  const [ideaLoading, setIdeaLoading] = useState(false);

  // Keyed on date + meal count (not totals) so edits don't spend coach calls;
  // debounced so meals landing close together share one call.
  useEffect(() => {
    if (state.loading || !isToday) return undefined;
    const cached = ideaCache.get(ideaKey);
    setIdea(cached ?? null);
    setIdeaLoading(!cached);
    if (cached) return undefined;

    let live = true;
    const timer = setTimeout(async () => {
      const res = await getFoodIdea({
        goal: profile.goalType,
        targets,
        totals,
        meals: meals.map((m) => ({
          name: m.description || "Meal",
          calories: m.calories || 0,
          protein: m.protein || 0,
          health_score: m.nutrition?.health_score ?? null,
        })),
        localTime: getTimeNow24h(),
      });
      if (!live) return;
      if (res.ok) ideaCache.set(ideaKey, res.idea);
      setIdea(res.ok ? res.idea : null);
      setIdeaLoading(false);
    }, IDEA_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [ideaKey, state.loading, isToday]);

  return (
    <Card style={styles.card}>
      <Text style={text.eyebrow}>CALORIES</Text>
      {loading ? (
        <View style={styles.skeletonBody}>
          <SkeletonBar width="55%" />
          <SkeletonBar width="80%" />
          <SkeletonBar width="65%" />
        </View>
      ) : (
        <>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <View style={styles.valueRow}>
                <NumberTicker
                  value={Math.round(totals.calories)}
                  animTrigger={animTrigger}
                  style={text.statValue}
                />
                <Text style={[text.footnote, styles.unit]}>
                  {`/ ${targets.calories.toLocaleString()} kcal`}
                </Text>
              </View>
              <Text style={[text.footnote, styles.reason]}>
                {grade?.reason ??
                  (isToday ? "Log a meal to get today's grade." : "Nothing logged this day.")}
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={grade ? `Day grade ${grade.letter}` : "No grade yet"}
              style={[
                styles.grade,
                { backgroundColor: gradeColor ? gradeColor + "29" : palette.fill },
              ]}
            >
              <Text style={[text.headline, { color: gradeColor || palette.secondaryLabel }]}>
                {grade?.letter ?? "–"}
              </Text>
            </View>
          </View>
          <View style={styles.barWrap}>
            <StatBar
              progress={totals.calories / targets.calories}
              color={palette.green}
              animTrigger={animTrigger}
            />
          </View>

          {MACROS.map((m) => (
            <View key={m.key} style={styles.macro}>
              <View style={styles.macroLabels}>
                <Text style={[text.caption, { color: palette.label }]}>{m.label}</Text>
                <Text style={text.caption}>
                  {`${Math.round(totals[m.key])} / ${targets[m.key]} g`}
                </Text>
              </View>
              <StatBar
                progress={totals[m.key] / targets[m.key]}
                color={palette[m.color]}
                animTrigger={animTrigger}
              />
            </View>
          ))}

          <View style={styles.caps}>
            <Text style={[text.caption, totals.sugar > targets.sugarMax && { color: palette.red }]}>
              {`Sugar ${totals.sugar} / ${targets.sugarMax} g`}
            </Text>
            <Text style={[text.caption, totals.sodium > targets.sodiumMax && { color: palette.red }]}>
              {`Sodium ${totals.sodium.toLocaleString()} / ${targets.sodiumMax.toLocaleString()} mg`}
            </Text>
          </View>

          {isToday && (
            <View style={[styles.next, { borderTopColor: palette.separator }]}>
              <Text style={text.eyebrow}>WHAT TO EAT NEXT</Text>
              <Text style={[text.subheadline, styles.gapLine]}>
                {gapLine(totals, targets) ?? "Targets hit for today. Nice."}
              </Text>
              {ideaLoading ? (
                <SkeletonBar width="85%" style={styles.ideaSkeleton} />
              ) : idea ? (
                <Animated.View entering={FadeIn.duration(300)} style={styles.idea}>
                  <Ionicons name="sparkles" size={15} color={palette.green} style={styles.ideaIcon} />
                  <Text style={[text.footnote, styles.ideaText]} numberOfLines={3}>
                    {idea}
                  </Text>
                </Animated.View>
              ) : null}
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SCREEN_MARGIN,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  heroText: {
    flex: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  unit: {
    marginBottom: 1,
  },
  reason: {
    marginTop: 2,
  },
  grade: {
    width: GRADE_SIZE,
    height: GRADE_SIZE,
    borderRadius: GRADE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  barWrap: {
    marginTop: 10,
  },
  macro: {
    marginTop: 12,
  },
  macroLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  caps: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
  },
  next: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gapLine: {
    marginTop: 6,
  },
  idea: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  ideaIcon: {
    marginTop: 2,
  },
  ideaText: {
    flex: 1,
  },
  ideaSkeleton: {
    marginTop: 12,
  },
  skeletonBody: {
    marginTop: 14,
    gap: 12,
  },
});
