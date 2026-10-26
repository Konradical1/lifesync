import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, useTodayFood } from '../../store/useStore';
import { formatTime12h, getTimeNow24h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';
import { prepareFoodPhoto } from '../../api/ai';
import pickFoodPhoto from '../../utils/pickFoodPhoto';
import { usePendingFood, queueFood, retryPending, removePending } from '../../store/pendingFood';
import { foodStreak } from '../Food/FoodScan';
import Card from '../ui/Card';
const { healthTone } = require('../../utils/nutrition');

const SCREEN_MARGIN = 20;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Big camera-first capture row: snap, upload, or type a meal. */
export function FoodCapture() {
  const navigation = useNavigation();
  const { palette, text } = useTheme();
  const { state } = useStore();
  const streak = foodStreak(state.events, todayKey());

  // Slow "breathing" glow behind the snap button, inviting the next scan.
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1);
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.45, 0]),
    transform: [{ scaleX: interpolate(glow.value, [0, 1], [1, 1.06]) }, { scaleY: interpolate(glow.value, [0, 1], [1, 1.3]) }],
  }));

  // Snap and go: the photo joins the queue and is estimated while you stay on Home.
  const pick = async (source) => {
    const uri = await pickFoodPhoto(source);
    if (!uri) return;
    let image;
    try {
      image = await prepareFoodPhoto(uri);
    } catch {
      Alert.alert('Could not read that photo', 'Try another one.');
      return;
    }
    queueFood({ image, date: todayKey(), time: getTimeNow24h(), goal: state.profile.goalType });
  };

  return (
    <View style={styles.captureRow}>
      <View style={styles.snapWrap}>
        <Animated.View
          pointerEvents="none"
          style={[styles.snapButton, styles.snapGlow, { backgroundColor: palette.green }, glowStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a photo of your food"
          onPress={() => pick('camera')}
          style={({ pressed }) => [
            styles.snapButton,
            { backgroundColor: palette.green },
            pressed && styles.snapPressed,
          ]}
        >
          <Ionicons name="camera" size={26} color="#FFFFFF" />
          <View>
            <Text style={[text.headline, styles.snapLabel]}>Snap a meal</Text>
            <Text style={[text.caption, styles.snapStreak]}>
              {streak ? `🔥 ${streak}-day streak` : 'Start a streak today'}
            </Text>
          </View>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upload a food photo"
        onPress={() => pick('library')}
        style={({ pressed }) => [
          styles.smallButton,
          { backgroundColor: palette.card },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="images" size={22} color={palette.label} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Describe a meal"
        onPress={() => navigation.navigate('FoodEvent')}
        style={({ pressed }) => [
          styles.smallButton,
          { backgroundColor: palette.card },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="create" size={22} color={palette.label} />
      </Pressable>
    </View>
  );
}

/** "Analyzing…" with a soft pulse while the queue estimates the meal. */
function AnalyzingText() {
  const { text } = useTheme();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.Text style={[text.footnote, pulseStyle]}>Analyzing…</Animated.Text>;
}

/** A queued meal: analyzing, waiting for internet, or failed (Retry). Always removable. */
function PendingRow({ item, last }) {
  const { palette, text } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOut}
      layout={LinearTransition.springify()}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.separator }]}
    >
      {item.image ? (
        <Image source={{ uri: `data:image/jpeg;base64,${item.image}` }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: palette.fill }]}>
          <Ionicons name="create-outline" size={20} color={palette.secondaryLabel} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={text.subheadline} numberOfLines={1}>
          {item.text || 'Photo meal'}
        </Text>
        {item.status === 'analyzing' ? (
          <AnalyzingText />
        ) : item.status === 'waiting' ? (
          <Text style={text.footnote}>Waiting for internet</Text>
        ) : (
          <Text style={[text.footnote, { color: palette.red }]} numberOfLines={2}>
            {item.error || 'Could not estimate'}
          </Text>
        )}
      </View>
      {item.status === 'error' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          hitSlop={10}
          onPress={() => retryPending(item.id)}
        >
          <Ionicons name="refresh-circle" size={26} color={palette.tint} />
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove"
        hitSlop={10}
        onPress={() => removePending(item.id)}
      >
        <Ionicons name="close-circle" size={22} color={palette.tertiaryLabel} />
      </Pressable>
    </Animated.View>
  );
}

/** Meals still being estimated first, then today's meals newest first. Tap a meal for details. */
export function TodayMeals() {
  const navigation = useNavigation();
  const { palette, text } = useTheme();
  const pending = usePendingFood();
  const meals = [...useTodayFood().meals].sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  if (!meals.length && !pending.length) {
    return (
      <Card style={styles.card}>
        <Text style={[text.footnote, styles.empty]}>
          No meals yet today. Snap your first one.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, styles.listCard]}>
      {pending.map((item, i) => (
        <PendingRow key={item.id} item={item} last={!meals.length && i === pending.length - 1} />
      ))}
      {meals.map((meal, i) => {
        const score = meal.nutrition?.health_score;
        const tone = healthTone(score);
        const label = `${meal.description || 'Meal'}, ${meal.calories || 0} calories`;
        return (
          <Animated.View key={meal.id} entering={FadeInDown.springify()} layout={LinearTransition.springify()}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tone ? `${label}, health ${score} out of 10` : label}
              onPress={() => navigation.navigate('FoodEvent', { eventId: meal.id })}
              style={({ pressed }) => [
                styles.row,
                i < meals.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: palette.separator,
                },
                pressed && { backgroundColor: palette.cardElevated },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={text.subheadline} numberOfLines={1}>
                  {meal.description || 'Meal'}
                </Text>
                <Text style={text.footnote} numberOfLines={1}>
                  {formatTime12h(meal.time)}
                  {meal.note ? ` · ${meal.note}` : ''}
                </Text>
              </View>
              {tone && (
                <View style={[styles.chip, { backgroundColor: palette[tone] + '29' }]}>
                  <Text style={[text.caption, { color: palette[tone] }]}>{score}/10</Text>
                </View>
              )}
              <View style={styles.rowRight}>
                <Text style={text.headline}>{meal.calories || 0}</Text>
                <Text style={text.caption}>
                  {meal.protein || 0}p · {meal.carbs || 0}c · {meal.fat || 0}f
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  captureRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: SCREEN_MARGIN,
    marginTop: 14,
  },
  snapWrap: {
    flex: 1,
  },
  snapButton: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  snapGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  snapPressed: {
    transform: [{ scale: 0.96 }],
  },
  snapLabel: {
    color: '#FFFFFF',
  },
  snapStreak: {
    color: 'rgba(255,255,255,0.85)',
  },
  smallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: SCREEN_MARGIN,
  },
  listCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  thumbIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});
