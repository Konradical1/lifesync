import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useConfetti } from '../ConfettiProvider';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { useTodayWaterOz } from '../../store/useStore';
import { getTimeNow24h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { SkeletonBar, SkeletonLines } from './SkeletonText';

const OZ_OPTIONS = [16, 24, 32];
const STROKE_RATIO = 0.08;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const OzSelector = React.memo(function OzSelector({ oz, selected, onSelect }) {
  return (
    <Pressable
      onPress={() => onSelect(oz)}
      style={({ pressed }) => [
        styles.selector,
        selected && styles.selectorSelected,
        pressed && styles.selectorPressed,
      ]}
    >
      <Text style={[styles.selectorText, selected && styles.selectorTextSelected]}>
        {oz}oz
      </Text>
    </Pressable>
  );
});

function RadialProgress({ size, progress, color, resetTrigger }) {
  const stroke = Math.max(10, size * STROKE_RATIO);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(progress);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    const isReset = resetTrigger != null && resetTrigger > 0 && resetTrigger !== lastResetTrigger.current;
    if (isReset) lastResetTrigger.current = resetTrigger;

    if (isReset) {
      animatedProgress.value = 0;
      requestAnimationFrame(() => {
        animatedProgress.value = withSpring(clampedProgress, {
          damping: 18,
          stiffness: 120,
          mass: 0.8,
        });
      });
    } else {
      animatedProgress.value = withSpring(clampedProgress, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      });
    }
  }, [clampedProgress, resetTrigger]);

  const animatedProps = useAnimatedProps(() => {
    const p = animatedProgress.value;
    const strokeDashoffset = circumference * (1 - p);
    return { strokeDashoffset };
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
        animatedProps={animatedProps}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const TICKER_DURATION_MS = 900;

function AnimatedNumberTicker({ value, refreshTrigger, style }) {
  const animatedValue = useSharedValue(value);
  const [display, setDisplay] = useState(value);
  const prevTrigger = useRef(refreshTrigger);

  useEffect(() => {
    const shouldAnimate = refreshTrigger != null && refreshTrigger > 0 && refreshTrigger !== prevTrigger.current;
    if (shouldAnimate) {
      prevTrigger.current = refreshTrigger;
      setDisplay(0);
      animatedValue.value = 0;
      const id = requestAnimationFrame(() => {
        animatedValue.value = withTiming(value, { duration: TICKER_DURATION_MS / 1000 });
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
    }
  );

  return <Text style={style}>{display}</Text>;
}

export default function WaterTracker({ refreshTrigger, loading = false }) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { state, dispatch } = useStore();
  const todayOz = useTodayWaterOz();
  const profile = state.profile || {};
  const waterGoal = parseInt(profile.waterGoalOz, 10) || 64;

  const [selectedOz, setSelectedOz] = useState(32);
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0 });
  const fireConfetti = useConfetti();

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

  const progress = waterGoal > 0 ? Math.min(1, todayOz / waterGoal) : 0;

  const horizontalPadding = spacing.md * 2;
  const gap = spacing.lg;
  const leftWidth = Math.floor((width - horizontalPadding - gap) * 0.48);
  const ringSize = Math.floor((width - horizontalPadding - gap) * 0.42);

  const selectOz = useCallback((oz) => setSelectedOz(oz), []);

  const handleDrink = useCallback(
    (e) => {
      const { pageX, pageY } = e?.nativeEvent ?? {};
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const today = formatDateKey(new Date());
      dispatch({
        type: 'ADD_WATER_ENTRY',
        payload: {
          id: generateId(),
          date: today,
          time: getTimeNow24h(),
          oz: selectedOz,
          createdAt: new Date().toISOString(),
        },
      });
      if (typeof pageX === 'number' && typeof pageY === 'number') {
        fireConfetti.fire(pageX, pageY);
      }
    },
    [selectedOz, dispatch, fireConfetti]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card} onLayout={(e) => setCardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {renderCardGradient('waterCardGradientLoading')}
          <Ionicons name="water-outline" size={20} color={colors.textSecondary} style={styles.cardIcon} />
          <View style={styles.row}>
            <View style={[styles.leftColumn, { maxWidth: leftWidth }]}>
              <SkeletonLines widths={['70%', '70%', '50%']} gap={10} />
              <View style={styles.skeletonButtonWrap}>
                <SkeletonBar width="100%" />
              </View>
              <View style={styles.skeletonHistoryWrap}>
                <SkeletonBar width="50%" />
              </View>
            </View>
            <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
              <RadialProgress size={ringSize} progress={0} color={colors.water} resetTrigger={0} />
              <View style={styles.ringCenter}>
                <SkeletonBar width={40} />
                <SkeletonBar width={24} style={{ marginTop: 4 }} />
                <SkeletonBar width={36} style={{ marginTop: 2 }} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card} onLayout={(e) => setCardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {renderCardGradient('waterCardGradient')}
        <Ionicons name="water-outline" size={20} color={colors.textSecondary} style={styles.cardIcon} />
        <View style={styles.row}>
          <View style={[styles.leftColumn, { maxWidth: leftWidth }]}>
            <View style={styles.selectors}>
              {OZ_OPTIONS.map((oz) => (
                <OzSelector
                  key={oz}
                  oz={oz}
                  selected={selectedOz === oz}
                  onSelect={selectOz}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleDrink}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>I drank {selectedOz} oz of water</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.historyLink}
              onPress={() => navigation.navigate('WaterHistory')}
            >
              <Ionicons name="time-outline" size={16} color={colors.accent} />
              <Text style={styles.historyLinkText}>View history</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
            <RadialProgress size={ringSize} progress={progress} color={colors.water} resetTrigger={refreshTrigger} />
            <View style={styles.ringCenter}>
              <AnimatedNumberTicker value={todayOz} refreshTrigger={refreshTrigger} style={styles.ringValue} />
              <Text style={styles.ringUnit}>oz</Text>
              <Text style={styles.ringGoal}>/ {waterGoal}</Text>
            </View>
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
    gap: spacing.md,
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  selectors: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  selector: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorSelected: {
    backgroundColor: colors.water + '30',
    borderColor: colors.water,
  },
  selectorPressed: {
    opacity: 0.7,
  },
  selectorText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  selectorTextSelected: {
    color: colors.water,
    fontWeight: '600',
  },
  skeletonButtonWrap: {
    marginBottom: spacing.sm,
  },
  skeletonHistoryWrap: {
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.water,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  buttonText: {
    fontSize: typography.callout.fontSize,
    fontWeight: '600',
    color: colors.background,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  historyLinkText: {
    fontSize: typography.caption1.fontSize,
    color: colors.accent,
  },
  svg: {
    position: 'absolute',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  ringGoal: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
