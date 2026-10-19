import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';
import pickFoodPhoto from '../../utils/pickFoodPhoto';
import { usePendingFood, removePending } from '../../store/pendingFood';
import { foodStreak } from '../Food/FoodScan';
import Card from '../ui/Card';

const SCREEN_MARGIN = 20;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Big camera-first capture row: snap, upload, or type a meal. */
export function FoodCapture() {
  const navigation = useNavigation();
  const { palette, text } = useTheme();
  const streak = foodStreak(useEvents(), todayKey());

  // Slow "breathing" glow behind the snap button, inviting the next scan.
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1);
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.45, 0]),
    transform: [{ scaleX: interpolate(glow.value, [0, 1], [1, 1.06]) }, { scaleY: interpolate(glow.value, [0, 1], [1, 1.3]) }],
  }));

  const pick = async (source) => {
    const photoUri = await pickFoodPhoto(source);
    if (photoUri) navigation.navigate('FoodEvent', { photoUri });
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

/** Meals saved offline, waiting for internet to be estimated. */
function PendingRows() {
  const { palette, text } = useTheme();
  const pending = usePendingFood();
  return pending.map((p) => (
    <View
      key={p.id}
      style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.separator }]}
    >
      {p.image ? (
        <Image source={{ uri: `data:image/jpeg;base64,${p.image}` }} style={styles.thumb} />
      ) : (
        <Ionicons name="cloud-offline" size={22} color={palette.secondaryLabel} />
      )}
      <View style={styles.rowText}>
        <Text style={text.subheadline} numberOfLines={1}>
          {p.text || 'Photo meal'}
        </Text>
        <Text style={[text.footnote, p.error && { color: palette.red }]} numberOfLines={2}>
          {p.error || `${formatTime12h(p.time)} · estimates when you're online`}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove saved meal"
        hitSlop={10}
        onPress={() => removePending(p.id)}
      >
        <Ionicons name="close-circle" size={22} color={palette.tertiaryLabel} />
      </Pressable>
    </View>
  ));
}

/** Today's meals, newest first, with a macro total line. */
export function TodayMeals() {
  const navigation = useNavigation();
  const { palette, text } = useTheme();
  const pendingCount = usePendingFood().length;
  const meals = useEvents(todayKey())
    .filter((e) => e.type === EVENT_TYPES.food)
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  if (!meals.length && !pendingCount) {
    return (
      <Card style={styles.card}>
        <Text style={[text.footnote, styles.empty]}>
          No meals yet today. Snap your first one.
        </Text>
      </Card>
    );
  }

  const total = (key) => meals.reduce((sum, e) => sum + (Number(e[key]) || 0), 0);

  return (
    <Card style={[styles.card, styles.listCard]}>
      <View style={[styles.totals, { borderBottomColor: palette.separator }]}>
        {[
          ['Carbs', total('carbs'), palette.cyan],
          ['Fat', total('fat'), palette.purple],
          ['Protein', total('protein'), palette.orange],
        ].map(([label, value, color]) => (
          <Text key={label} style={text.caption}>
            <Text style={{ color }}>●</Text> {label} {value}g
          </Text>
        ))}
      </View>
      <PendingRows />
      {meals.map((meal, i) => (
        <Animated.View key={meal.id} entering={FadeInDown.springify()} layout={LinearTransition.springify()}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${meal.description}, ${meal.calories || 0} calories`}
            onPress={() =>
              navigation.navigate('CalendarTab', {
                screen: 'Calendar',
                params: { focusDate: meal.date, focusEventId: meal.id },
              })
            }
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
            <View style={styles.rowRight}>
              <Text style={text.headline}>{meal.calories || 0}</Text>
              <Text style={text.caption}>
                {meal.protein || 0}p · {meal.carbs || 0}c · {meal.fat || 0}f
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ))}
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
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  rowRight: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});
