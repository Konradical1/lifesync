/**
 * Food logging visuals: a scanner animation while the AI estimates a meal,
 * and an animated nutrition reveal.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_TYPES } from '../../store/mockData';
import { addDaysToDate } from '../../utils/time';

const SCAN_GREEN = '#30D158';
export const TEXT_STAGES = ['Looking it up', 'Checking the portion', 'Counting calories'];
const STAGE_MS = 1000;
const BEAM = 120;
const PING = 12;
// Where "detected" points pop up, as fractions of the frame.
const DOTS = [[0.3, 0.32], [0.64, 0.24], [0.48, 0.56], [0.76, 0.64], [0.22, 0.7], [0.58, 0.8], [0.86, 0.38]];
const CORNERS = ['tl', 'tr', 'bl', 'br'];
const RING = 76;
const STROKE = 7;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Consecutive days with a logged meal, counting back from today (or yesterday if today is empty so far). */
export function foodStreak(events, today) {
  const days = new Set(events.filter((e) => e.type === EVENT_TYPES.food).map((e) => e.date));
  let day = days.has(today) ? today : addDaysToDate(today, -1);
  let n = 0;
  while (days.has(day)) {
    n += 1;
    day = addDaysToDate(day, -1);
  }
  return n;
}

/** A detection point: pops in, then keeps sending out a sonar ring. */
function Ping({ delay, left, top }) {
  const pop = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 180 }));
    ring.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1));
  }, [delay, pop, ring]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 1], [0.9, 0]) * Math.min(pop.value, 1),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 3.4]) }],
  }));
  return (
    <View style={[styles.ping, { left: left - PING / 2, top: top - PING / 2 }]}>
      <Animated.View style={[styles.pingRing, ringStyle]} />
      <Animated.View style={[styles.pingDot, dotStyle]} />
    </View>
  );
}

/** Scanner drawn over its parent (a photo, or a dark card for typed meals) while waiting on the AI. */
export function ScanOverlay({ stages = TEXT_STAGES }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [stage, setStage] = useState(0);
  const beam = useSharedValue(0);
  const breathe = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    beam.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
    breathe.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
    progress.value = withTiming(0.92, { duration: 6000, easing: Easing.out(Easing.cubic) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= stages.length - 1) return clearInterval(timer);
      i += 1;
      setStage(i);
      Haptics.selectionAsync();
    }, STAGE_MS);
    return () => clearInterval(timer);
  }, [stages, beam, breathe, progress]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(beam.value, [0, 1], [-BEAM / 2, size.height - BEAM / 2]) }],
  }));
  const cornerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.5, 1]),
    transform: [{ scale: interpolate(breathe.value, [0, 1], [0.97, 1]) }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(250)}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      pointerEvents="none"
      accessible
      accessibilityLabel={`${stages[stage]}…`}
      accessibilityLiveRegion="polite"
    >
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      {size.width > 0 &&
        DOTS.map(([x, y], i) => (
          <Ping key={i} delay={250 + i * 380} left={x * size.width} top={y * size.height} />
        ))}
      <Animated.View style={[styles.beam, beamStyle]}>
        <Svg width="100%" height={BEAM}>
          <Defs>
            <LinearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SCAN_GREEN} stopOpacity="0" />
              <Stop offset="0.5" stopColor={SCAN_GREEN} stopOpacity="0.38" />
              <Stop offset="1" stopColor={SCAN_GREEN} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height={BEAM} fill="url(#beam)" />
        </Svg>
        <View style={styles.beamLine} />
      </Animated.View>
      <Animated.View style={[styles.corners, cornerStyle]}>
        {CORNERS.map((c) => (
          <View key={c} style={[styles.corner, styles[c]]} />
        ))}
      </Animated.View>
      <View style={styles.pillRow}>
        <BlurView intensity={45} tint="dark" style={styles.pill}>
          <Ionicons name="sparkles" size={15} color={SCAN_GREEN} />
          <Animated.Text key={stage} entering={FadeInDown.duration(260)} style={styles.pillText}>
            {stages[stage]}…
          </Animated.Text>
        </BlurView>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </Animated.View>
  );
}

/** Number that eases from what it showed before to `value` (delayed only the first time). */
function CountUp({ value, style, delay = 0, duration = 900 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    const start = from.current;
    const t0 = Date.now() + (first.current ? delay : 0);
    first.current = false;
    let raf;
    const tick = () => {
      const p = Math.min(1, Math.max(0, (Date.now() - t0) / duration));
      const v = Math.round(start + (value - start) * (1 - (1 - p) ** 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, duration]);
  return <Text style={style}>{shown}</Text>;
}

function MacroRing({ label, grams, share, color, delay, palette, text }) {
  const fill = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    const anim = withTiming(share, { duration: 900, easing: Easing.out(Easing.cubic) });
    fill.value = first.current ? withDelay(delay, anim) : anim;
    first.current = false;
  }, [share, delay, fill]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - fill.value) }));
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(12)} style={styles.ringCell}>
      <View style={styles.ring}>
        <Svg width={RING} height={RING} style={styles.ringSvg}>
          <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={palette.fill} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            fill="none"
            animatedProps={ringProps}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <CountUp value={grams} delay={delay} style={[text.headline, styles.tabular]} />
          <Text style={text.caption}>g</Text>
        </View>
      </View>
      <Text style={[text.caption, { color }]}>{label}</Text>
    </Animated.View>
  );
}

/**
 * Big calorie count-up, protein/carbs/fat rings that fill to their share of the
 * meal's calories, then fiber, sugar and sodium under them ('—' when unknown).
 */
export function NutritionReveal({ calories, protein, carbs, fat, fiber, sugar, sodium, palette, text }) {
  const macroKcal = Math.max(1, protein * 4 + carbs * 4 + fat * 9);
  const macros = [
    ['Protein', protein, 4, palette.orange],
    ['Carbs', carbs, 4, palette.cyan],
    ['Fat', fat, 9, palette.purple],
  ];
  // Sugar and sodium are caps, so they stay neutral.
  const extras = [
    ['Fiber', fiber, 'g', palette.indigo],
    ['Sugar', sugar, 'g', palette.secondaryLabel],
    ['Sodium', sodium, 'mg', palette.secondaryLabel],
  ];
  return (
    <View>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.kcalRow}>
        <CountUp value={calories} duration={1100} style={[styles.kcal, { color: palette.label }]} />
        <Text style={[text.headline, { color: palette.secondaryLabel }]}>kcal</Text>
      </Animated.View>
      <View style={styles.rings}>
        {macros.map(([label, grams, kcalPerGram, color], i) => (
          <MacroRing
            key={label}
            label={label}
            grams={grams}
            share={Math.min(1, (grams * kcalPerGram) / macroKcal)}
            color={color}
            delay={250 + i * 140}
            palette={palette}
            text={text}
          />
        ))}
      </View>
      <Animated.View entering={FadeInDown.delay(700)} style={styles.rings}>
        {extras.map(([label, value, unit, color]) => (
          <View key={label} style={styles.extraCell}>
            {value == null ? (
              <Text style={[text.headline, { color: palette.tertiaryLabel }]}>—</Text>
            ) : (
              <View style={styles.extraValue}>
                <CountUp value={value} delay={700} style={[text.headline, styles.tabular]} />
                <Text style={text.caption}>{unit}</Text>
              </View>
            )}
            <Text style={[text.caption, { color }]}>{label}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  beam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BEAM,
  },
  beamLine: {
    position: 'absolute',
    top: BEAM / 2 - 1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#C7FFD4',
    shadowColor: SCAN_GREEN,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  corners: {
    ...StyleSheet.absoluteFillObject,
    margin: 16,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  ping: {
    position: 'absolute',
    width: PING,
    height: PING,
  },
  pingDot: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PING / 2,
    backgroundColor: SCAN_GREEN,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pingRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PING / 2,
    borderWidth: 1.5,
    borderColor: SCAN_GREEN,
  },
  pillRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bar: {
    height: 4,
    backgroundColor: SCAN_GREEN,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  kcal: {
    fontSize: 60,
    lineHeight: 66,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  rings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  ringCell: {
    alignItems: 'center',
    gap: 6,
  },
  ring: {
    width: RING,
    height: RING,
  },
  ringSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: 26,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  // Same width as a ring so each nutrient sits under a macro.
  extraCell: {
    width: RING,
    alignItems: 'center',
    gap: 2,
  },
  extraValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
});
