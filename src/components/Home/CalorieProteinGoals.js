import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useStore } from '../../store/useStore';
import { useTodayCaloriesAndProtein } from '../../store/useStore';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

const STROKE_RATIO = 0.08;

function RadialProgress({ size, progress, color }) {
  const stroke = Math.max(10, size * STROKE_RATIO);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <Svg width={size} height={size} style={styles.svg}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.surfaceElevated}
        strokeWidth={stroke}
        fill="transparent"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function CalorieProteinGoals() {
  const { width } = useWindowDimensions();
  const { state } = useStore();
  const { calories, protein } = useTodayCaloriesAndProtein();
  const profile = state.profile || {};
  const calorieGoal = parseInt(profile.calorieGoal, 10) || 2000;
  const proteinGoal = parseInt(profile.proteinGoal, 10) || 120;

  const calorieProgress = calorieGoal > 0 ? Math.min(1, calories / calorieGoal) : 0;
  const proteinProgress = proteinGoal > 0 ? Math.min(1, protein / proteinGoal) : 0;

  const horizontalPadding = spacing.md * 2;
  const gap = spacing.md;
  const ringSize = Math.floor(((width - horizontalPadding - gap) / 2) * 0.82);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
            <RadialProgress size={ringSize} progress={calorieProgress} color={colors.eventFood} />
            <View style={styles.ringCenter}>
              <Text style={styles.ringValue}>{calories}</Text>
              <Text style={styles.ringUnit}>cal</Text>
            </View>
          </View>
          <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
            <RadialProgress size={ringSize} progress={proteinProgress} color={colors.eventExercise} />
            <View style={styles.ringCenter}>
              <Text style={styles.ringValue}>{protein}</Text>
              <Text style={styles.ringUnit}>g</Text>
            </View>
          </View>
        </View>
        <View style={styles.labels}>
          <View style={[styles.labelWrap, { width: ringSize }]}>
            <Text style={styles.label}>
              {calories} / {calorieGoal} calories
            </Text>
          </View>
          <View style={[styles.labelWrap, { width: ringSize }]}>
            <Text style={styles.label}>
              {protein} / {proteinGoal} g protein
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  svg: {
    position: 'absolute',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: typography.title1.fontSize,
    fontWeight: typography.title1.fontWeight,
    color: colors.textPrimary,
  },
  ringUnit: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  labelWrap: {
    alignItems: 'center',
  },
  label: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
