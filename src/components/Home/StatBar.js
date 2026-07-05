import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../../store/ThemeContext";

const BAR_HEIGHT = 8;
const MARKER_SIZE = 6;
const ANIM_DURATION = 800;
const MIN_VISIBLE_FILL = 0.04;

/**
 * Thin rounded progress bar with a marker notch riding the fill edge.
 * Re-animates from zero whenever animTrigger increments.
 */
export default function StatBar({ progress, color, animTrigger = 0 }) {
  const { palette } = useTheme();
  const animVal = useRef(new Animated.Value(0)).current;
  const prevTriggerRef = useRef(animTrigger);
  const hasAnimatedRef = useRef(false);

  const clamped = Math.min(1, Math.max(0, progress));
  const target = clamped > 0 ? Math.max(MIN_VISIBLE_FILL, clamped) : 0;

  useEffect(() => {
    const isTriggered = animTrigger > 0 && animTrigger !== prevTriggerRef.current;
    if (animTrigger > 0) prevTriggerRef.current = animTrigger;
    const shouldRestart = isTriggered || !hasAnimatedRef.current;
    hasAnimatedRef.current = true;

    if (shouldRestart) animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: target,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start();
  }, [animTrigger, target, animVal]);

  const width = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: palette.fill }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]}>
          {target > 0 ? (
            <View style={[styles.marker, { borderTopColor: color }]} />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: MARKER_SIZE + 2,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    minWidth: BAR_HEIGHT,
  },
  marker: {
    position: "absolute",
    top: -(MARKER_SIZE + 2),
    right: 0,
    width: 0,
    height: 0,
    borderLeftWidth: MARKER_SIZE / 2 + 1,
    borderRightWidth: MARKER_SIZE / 2 + 1,
    borderTopWidth: MARKER_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
