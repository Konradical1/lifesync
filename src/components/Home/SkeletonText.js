import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

const LINE_HEIGHT = 14;
const LINE_BORDER_RADIUS = 6;
const PULSE_DURATION = 800;

/** Single skeleton bar (placeholder for text). width: number or string e.g. '60%'. */
export function SkeletonBar({ width = '100%', style }) {
  const { palette } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: PULSE_DURATION, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: PULSE_DURATION, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        styles.line,
        { backgroundColor: palette.cardElevated, width, opacity },
        style,
      ]}
    />
  );
}

/** Multiple skeleton lines (e.g. 3 bars for paragraph). widths: array of width strings/numbers. */
export function SkeletonLines({ widths = ['100%', '82%', '55%'], gap = 10 }) {
  const { palette } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: PULSE_DURATION, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: PULSE_DURATION, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <View style={[styles.container, { gap }]}>
      {widths.map((w, i) => (
        <Animated.View
          key={i}
          style={[styles.line, { backgroundColor: palette.cardElevated, width: w, opacity }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  line: {
    height: LINE_HEIGHT,
    borderRadius: LINE_BORDER_RADIUS,
  },
});
