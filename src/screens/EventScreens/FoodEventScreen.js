import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, useEvents } from '../../store/useStore';
import { getTimeNow24h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';
import { analyzeFood, prepareFoodPhoto } from '../../api/ai';
import { isSupabaseConfigured } from '../../api/supabase';
import { deleteEventFromSupabase } from '../../api/supabaseSync';
import { queueFood } from '../../store/pendingFood';
import pickFoodPhoto from '../../utils/pickFoodPhoto';
import { ScanOverlay, NutritionReveal } from '../../components/Food/FoodScan';

const { healthTone } = require('../../utils/nutrition');

const CTA_HEIGHT = 56;
const CONTROL_RADIUS = 14;
const SERVING_STEP = 0.5;
const TAB_BAR_CLEARANCE = 140;
const NUMBERS = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'sugar', label: 'Sugar (g)' },
  { key: 'sodium', label: 'Sodium (mg)' },
];
const SOURCE_LABELS = {
  label: 'Read from label',
  brand: 'Known product',
  estimate: 'Estimated',
};

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Draft numbers as strings: calories and macros from the meal, the rest from its nutrition ('' when missing). */
function toFields(meal) {
  const n = meal.nutrition ?? {};
  return {
    calories: String(meal.calories ?? ''),
    protein: String(meal.protein ?? ''),
    carbs: String(meal.carbs ?? ''),
    fat: String(meal.fat ?? ''),
    fiber: String(n.fiber ?? ''),
    sugar: String(n.sugar ?? ''),
    sodium: String(n.sodium ?? ''),
  };
}

/** No eventId: log a meal into the background queue (params.date, default today). params.eventId: view and edit a logged meal. */
export default function FoodEventScreen() {
  const navigation = useNavigation();
  const eventId = useRoute().params?.eventId;
  const insets = useSafeAreaInsets();
  const { palette, text } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="chevron-back" size={26} color={palette.label} />
        </Pressable>
        <Text style={text.title2}>{eventId ? 'your meal.' : 'log food.'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {eventId ? <MealDetail key={eventId} eventId={eventId} /> : <AddMeal />}
      </ScrollView>
    </View>
  );
}

/** Snap, upload or describe a meal: it's estimated in the background while we head back to Home. */
function AddMeal() {
  const navigation = useNavigation();
  const date = useRoute().params?.date || formatDateKey(new Date());
  const { palette, text } = useTheme();
  const { state } = useStore();
  const [description, setDescription] = useState('');
  const [preparing, setPreparing] = useState(null); // 'camera' | 'library' while the photo is shrunk
  const [error, setError] = useState(null);

  const queueAndLeave = (entry) => {
    queueFood({ ...entry, date, time: getTimeNow24h(), goal: state.profile.goalType });
    // Lands on Home from either stack (navigating to the Home route by name would push a second one).
    navigation.popToTop();
    navigation.getParent()?.navigate('HomeTab');
  };

  const handlePick = async (source) => {
    const uri = await pickFoodPhoto(source);
    if (!uri) return;
    setError(null);
    setPreparing(source);
    let image;
    try {
      image = await prepareFoodPhoto(uri);
    } catch {
      setPreparing(null);
      setError('Could not read that photo');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    queueAndLeave({ image });
  };

  const handleLogText = () => {
    const meal = description.trim();
    if (meal) queueAndLeave({ text: meal });
  };

  return (
    <>
      <View style={styles.pickRow}>
        {[
          { source: 'camera', icon: 'camera', label: 'Take photo' },
          { source: 'library', icon: 'images', label: 'Upload' },
        ].map((b) => (
          <Pressable
            key={b.source}
            accessibilityRole="button"
            disabled={!!preparing}
            onPress={() => handlePick(b.source)}
            style={({ pressed }) => [
              styles.pickTile,
              { backgroundColor: palette.card },
              (pressed || (preparing && preparing !== b.source)) && styles.pressed,
            ]}
          >
            {preparing === b.source ? (
              <ActivityIndicator color={palette.green} />
            ) : (
              <Ionicons name={b.icon} size={28} color={palette.green} />
            )}
            <Text style={text.subheadline}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Text style={[text.footnote, styles.errorText, { color: palette.red }]}>{error}</Text>
      ) : null}
      <Text style={[text.eyebrow, styles.label]}>{'Or describe it'.toUpperCase()}</Text>
      <TextInput
        style={[text.body, styles.input, { backgroundColor: palette.fill }]}
        placeholder="e.g. Oatmeal with banana"
        placeholderTextColor={palette.tertiaryLabel}
        value={description}
        onChangeText={setDescription}
        returnKeyType="go"
        onSubmitEditing={handleLogText}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!description.trim()}
        onPress={handleLogText}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: palette.green },
          !description.trim() && styles.disabled,
          pressed && styles.saveButtonPressed,
        ]}
      >
        <Text style={[text.headline, styles.ctaLabel]}>Log it</Text>
      </Pressable>
    </>
  );
}

/** A logged meal: servings, every number, an AI re-estimate from a note, save and delete. */
function MealDetail({ eventId }) {
  const navigation = useNavigation();
  const { palette, text } = useTheme();
  const { state, dispatch } = useStore();
  const event = useEvents().find((e) => e.id === eventId);

  // Draft, set up once per meal (the screen keys this on eventId). Unsaved edits are dropped on back.
  const [name, setName] = useState(event?.description ?? '');
  const [portion, setPortion] = useState(event?.note ?? '');
  const [fields, setFields] = useState(() => toFields(event ?? {}));
  const [nutrition, setNutrition] = useState(event?.nutrition);
  const [servings, setServings] = useState(1);
  const [editing, setEditing] = useState(false);
  const [fixNote, setFixNote] = useState('');
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  // Gone (deleted here or elsewhere): leave. Delete relies on this instead of its own goBack.
  useEffect(() => {
    if (!event) navigation.goBack();
  }, [event, navigation]);
  // A re-estimate that lands after leaving is ignored.
  useEffect(() => () => {
    requestId.current++;
  }, []);

  if (!event) return null;

  const scaled = (key) => Math.round((parseInt(fields[key], 10) || 0) * servings);
  // Meals logged before nutrients existed show '—' until one is filled in.
  const extra = (key) => (nutrition || fields[key] !== '' ? scaled(key) : null);
  const items = (nutrition?.items ?? []).map((i) => ({ ...i, calories: Math.round(i.calories * servings) }));
  const trimmedPortion = portion.trim();
  const note = trimmedPortion ? (servings === 1 ? trimmedPortion : `${trimmedPortion} × ${servings}`) : undefined;
  const tone = healthTone(nutrition?.health_score);
  const sourceLabel = SOURCE_LABELS[nutrition?.source];

  const changeServings = (delta) => {
    Haptics.selectionAsync();
    setServings((s) => Math.max(SERVING_STEP, s + delta));
  };

  const handleFix = async () => {
    const fix = fixNote.trim();
    if (!fix || fixing) return;
    const id = ++requestId.current;
    setFixing(true);
    setError(null);
    // What's on screen now (servings included) is what the note corrects.
    const res = await analyzeFood({
      previous: { name, portion: note || '', items },
      note: fix,
      goal: state.profile.goalType,
    });
    if (id !== requestId.current) return;
    setFixing(false);
    if (!res.ok) {
      setError(res.offline ? "You're offline. Try again when you're back online." : res.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (res.data.description) setName(res.data.description);
    setPortion(res.data.note ?? '');
    setFields(toFields(res.data));
    setNutrition(res.data.nutrition);
    setServings(1);
    setFixNote('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSave = () => {
    const payload = {
      id: eventId,
      description: name.trim() || 'Meal',
      note,
      calories: scaled('calories'),
      protein: scaled('protein'),
      carbs: scaled('carbs'),
      fat: scaled('fat'),
    };
    // UPDATE_EVENT merges shallowly, so nutrition goes whole. Older meals only get one once a nutrient is filled in.
    if (nutrition || fields.fiber || fields.sugar || fields.sodium) {
      payload.nutrition = {
        ...nutrition,
        fiber: scaled('fiber'),
        sugar: scaled('sugar'),
        sodium: scaled('sodium'),
        items,
      };
    }
    dispatch({ type: 'UPDATE_EVENT', payload });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleDelete = () =>
    Alert.alert('Delete this meal?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_EVENT', payload: { id: eventId } });
          if (isSupabaseConfigured()) deleteEventFromSupabase(eventId).catch(() => {});
        },
      },
    ]);

  const inputStyle = [text.body, styles.input, { backgroundColor: palette.fill }];

  return (
    <>
      <Animated.View entering={FadeInDown.duration(350)}>
        <TextInput
          style={[text.title3, styles.nameInput]}
          value={name}
          onChangeText={setName}
          placeholder="Meal name"
          placeholderTextColor={palette.tertiaryLabel}
        />
        <View style={styles.metaRow}>
          {portion ? <Text style={text.footnote}>{portion}</Text> : null}
          {sourceLabel ? (
            <View style={[styles.chip, { backgroundColor: palette.fill }]}>
              <Text style={text.caption}>{sourceLabel}</Text>
            </View>
          ) : null}
        </View>
        {tone ? (
          <View style={styles.healthRow}>
            <View
              accessible
              accessibilityLabel={`Health score ${nutrition.health_score} out of 10`}
              style={[styles.chip, { backgroundColor: palette[tone] + '29' }]}
            >
              <Text style={[text.caption, { color: palette[tone] }]}>{nutrition.health_score}/10</Text>
            </View>
            {nutrition.feedback ? (
              <Text style={[text.footnote, styles.feedback]}>{nutrition.feedback}</Text>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      <NutritionReveal
        calories={scaled('calories')}
        protein={scaled('protein')}
        carbs={scaled('carbs')}
        fat={scaled('fat')}
        fiber={extra('fiber')}
        sugar={extra('sugar')}
        sodium={extra('sodium')}
        palette={palette}
        text={text}
      />

      {items.length > 1 &&
        items.map((item, i) => (
          <Animated.View
            key={`${item.name}-${i}`}
            entering={FadeInDown.delay(650 + i * 90).springify()}
            style={styles.itemRow}
          >
            <Text style={[text.footnote, styles.itemName]} numberOfLines={1}>
              {[item.name, item.portion].filter(Boolean).join(' · ')}
            </Text>
            <Text style={text.footnote}>{item.calories} kcal</Text>
          </Animated.View>
        ))}

      <Animated.View entering={FadeInDown.delay(800)} style={styles.servingsRow}>
        <Text style={text.eyebrow}>{'Servings'.toUpperCase()}</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel="Fewer servings"
            hitSlop={8}
            onPress={() => changeServings(-SERVING_STEP)}
          >
            <Ionicons name="remove-circle" size={30} color={palette.secondaryLabel} />
          </Pressable>
          <Text style={[text.headline, styles.servingsValue]}>{servings}</Text>
          <Pressable
            accessibilityLabel="More servings"
            hitSlop={8}
            onPress={() => changeServings(SERVING_STEP)}
          >
            <Ionicons name="add-circle" size={30} color={palette.green} />
          </Pressable>
        </View>
      </Animated.View>

      {editing ? (
        <View style={styles.macroGrid}>
          {NUMBERS.map(({ key, label }) => (
            <View key={key} style={styles.macroCell}>
              <Text style={[text.eyebrow, styles.label]}>{label.toUpperCase()}</Text>
              <TextInput
                style={inputStyle}
                value={servings === 1 ? fields[key] : fields[key] && String(scaled(key))}
                onChangeText={(v) => setFields((f) => ({ ...f, [key]: v }))}
                editable={servings === 1 && !fixing}
                keyboardType="number-pad"
              />
            </View>
          ))}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing(true)}
          style={styles.adjustLink}
        >
          <Text style={[text.subheadline, { color: palette.tint }]}>Adjust numbers</Text>
        </Pressable>
      )}

      <View style={styles.fixRow}>
        <TextInput
          style={[text.subheadline, styles.input, styles.fixInput, { backgroundColor: palette.fill }]}
          placeholder="Something off? e.g. it was a large"
          placeholderTextColor={palette.tertiaryLabel}
          value={fixNote}
          onChangeText={setFixNote}
          editable={!fixing}
          returnKeyType="go"
          onSubmitEditing={handleFix}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Re-estimate with note"
          disabled={!fixNote.trim() || fixing}
          onPress={handleFix}
          style={({ pressed }) => [(pressed || !fixNote.trim() || fixing) && styles.pressed]}
        >
          <Ionicons name="refresh-circle" size={40} color={palette.tint} />
        </Pressable>
      </View>
      {fixing && (
        <View style={styles.textScan}>
          <ScanOverlay />
        </View>
      )}
      {error ? (
        <Text style={[text.footnote, styles.errorText, { color: palette.red }]}>{error}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={fixing}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: palette.green },
          fixing && styles.disabled,
          pressed && styles.saveButtonPressed,
        ]}
      >
        <Text style={[text.headline, styles.ctaLabel]}>{`Save · ${scaled('calories')} kcal`}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={handleDelete} style={styles.deleteLink}>
        <Text style={[text.subheadline, { color: palette.red }]}>Delete</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  textScan: {
    height: 170,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#07170D',
    marginTop: 12,
  },
  pickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  pickTile: {
    flex: 1,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 12,
  },
  nameInput: {
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  feedback: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  itemName: {
    flex: 1,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  servingsValue: {
    minWidth: 32,
    textAlign: 'center',
  },
  adjustLink: {
    paddingVertical: 10,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    marginTop: 8,
  },
  macroCell: {
    width: '47%',
    flexGrow: 1,
  },
  fixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  fixInput: {
    flex: 1,
    marginBottom: 0,
  },
  saveButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  ctaLabel: {
    color: '#FFFFFF',
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.5,
  },
});
