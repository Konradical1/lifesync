import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useStore } from '../../store/useStore';
import { useTodayCaloriesAndProtein } from '../../store/useStore';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { SkeletonBar, SkeletonLines } from './SkeletonText';

const STROKE_RATIO = 0.08;
const ANIM_DURATION = 800;

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

function AnimatedRadialProgress({ size, progress, color, animTrigger }) {
  const stroke = Math.max(10, size * STROKE_RATIO);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const animVal = useRef(new RNAnimated.Value(0)).current;
  const prevTriggerRef = useRef(animTrigger);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const isTriggered = animTrigger > 0 && animTrigger !== prevTriggerRef.current;
    if (animTrigger > 0) prevTriggerRef.current = animTrigger;
    const shouldRun = isTriggered || !hasAnimatedRef.current;
    if (!shouldRun) return;
    hasAnimatedRef.current = true;

    animVal.setValue(0);
    RNAnimated.timing(animVal, {
      toValue: progress,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start();
  }, [animTrigger, progress, animVal]);

  const strokeDashoffset = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

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
      <AnimatedCircle
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

  return <Text style={style}>{display}</Text>;
}

export default function CalorieProteinGoals({ animTrigger = 0, loading = false }) {
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
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0 });

  const renderCardGradient = (gradientId) =>
    cardLayout.width > 0 &&
    cardLayout.height > 0 && (
      <Svg style={styles.cardGradientSvg} width={cardLayout.width} height={cardLayout.height} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1c2128" />
            <Stop offset="100%" stopColor={colors.surface} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={cardLayout.width} height={cardLayout.height} fill={`url(#${gradientId})`} rx={borderRadius.md} ry={borderRadius.md} />
      </Svg>
    );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card} onLayout={(e) => setCardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {renderCardGradient('foodCardGradientLoading')}
          <Ionicons name="nutrition-outline" size={20} color={colors.textSecondary} style={styles.cardIcon} />
          <View style={styles.row}>
            <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
              <Svg width={ringSize} height={ringSize} style={styles.svg}>
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={(ringSize - Math.max(10, ringSize * 0.08)) / 2}
                  stroke={colors.surfaceElevated}
                  strokeWidth={Math.max(10, ringSize * 0.08)}
                  fill="transparent"
                />
              </Svg>
              <View style={styles.ringCenter}>
                <SkeletonBar width={48} style={styles.skeletonNumber} />
                <SkeletonBar width={28} style={[styles.skeletonUnit, { marginTop: 4 }]} />
              </View>
            </View>
            <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
              <Svg width={ringSize} height={ringSize} style={styles.svg}>
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={(ringSize - Math.max(10, ringSize * 0.08)) / 2}
                  stroke={colors.surfaceElevated}
                  strokeWidth={Math.max(10, ringSize * 0.08)}
                  fill="transparent"
                />
              </Svg>
              <View style={styles.ringCenter}>
                <SkeletonBar width={40} style={styles.skeletonNumber} />
                <SkeletonBar width={16} style={[styles.skeletonUnit, { marginTop: 4 }]} />
              </View>
            </View>
          </View>
          <View style={styles.labels}>
            <View style={[styles.labelWrap, { width: ringSize }]}>
              <SkeletonLines widths={['85%']} gap={6} />
            </View>
            <View style={[styles.labelWrap, { width: ringSize }]}>
              <SkeletonLines widths={['80%']} gap={6} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card} onLayout={(e) => setCardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {renderCardGradient('foodCardGradient')}
        <Ionicons name="nutrition-outline" size={20} color={colors.textSecondary} style={styles.cardIcon} />
        <View style={styles.row}>
          <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
            <AnimatedRadialProgress size={ringSize} progress={calorieProgress} color={colors.eventFood} animTrigger={animTrigger} />
            <View style={styles.ringCenter}>
              <NumberTicker value={calories} animTrigger={animTrigger} style={styles.ringValue} />
              <Text style={styles.ringUnit}>cal</Text>
            </View>
          </View>
          <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
            <AnimatedRadialProgress size={ringSize} progress={proteinProgress} color={colors.eventExercise} animTrigger={animTrigger} />
            <View style={styles.ringCenter}>
              <NumberTicker value={protein} animTrigger={animTrigger} style={styles.ringValue} />
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
    position: 'relative',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardGradientSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    opacity: 0.35,
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
  skeletonNumber: {
    alignSelf: 'center',
  },
  skeletonUnit: {
    alignSelf: 'center',
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
