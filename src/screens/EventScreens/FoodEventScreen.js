import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, useEvents } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';
import { extractFood, analyzeFoodPhoto, prepareFoodPhoto } from '../../api/ai';
import { queueFood, isOnline } from '../../store/pendingFood';
import pickFoodPhoto from '../../utils/pickFoodPhoto';
import {
  ScanOverlay,
  NutritionReveal,
  LoggedCelebration,
  TEXT_STAGES,
  foodStreak,
} from '../../components/Food/FoodScan';

const CTA_HEIGHT = 56;
const CONTROL_RADIUS = 14;
const PHOTO_SCAN_HEIGHT = 340;
const PHOTO_RESULT_HEIGHT = 190;
const SERVING_STEP = 0.5;
const CELEBRATE_MS = 1500;
const MACROS = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
];
const SOURCE_LABELS = {
  label: 'Read from label',
  brand: 'Known product',
  estimate: 'Estimated from photo',
};

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function toFields(data) {
  return Object.fromEntries(MACROS.map(({ key }) => [key, String(data[key] ?? 0)]));
}

export default function FoodEventScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { palette, text } = useTheme();
  const { dispatch } = useStore();
  const events = useEvents();

  const [photoUri, setPhotoUri] = useState(route.params?.photoUri ?? null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { portion, source, items }
  const [fields, setFields] = useState(toFields({}));
  const [servings, setServings] = useState(1);
  const [editing, setEditing] = useState(false);
  const [fixNote, setFixNote] = useState('');
  const [error, setError] = useState(null);
  const [celebrate, setCelebrate] = useState(null); // { calories, streak } after saving
  const requestId = useRef(0);
  const imageRef = useRef(null); // downscaled base64 of photoUri, reused for re-runs
  const leaveTimer = useRef(null);

  // The photo is big while scanning, then shrinks to make room for the numbers.
  const showingResult = !!result && !loading;
  const photoHeight = useSharedValue(PHOTO_SCAN_HEIGHT);
  useEffect(() => {
    photoHeight.value = withTiming(showingResult ? PHOTO_RESULT_HEIGHT : PHOTO_SCAN_HEIGHT, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
  }, [showingResult, photoHeight]);
  const photoStyle = useAnimatedStyle(() => ({ height: photoHeight.value }));

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // No internet: keep the meal and estimate it automatically once back online.
  const saveForLater = (entry) => {
    queueFood({ ...entry, date: formatDateKey(new Date()), time: getTimeNow24h() });
    navigation.goBack();
  };

  const applyResult = (data) => {
    setResult({ portion: data.portion ?? '', source: data.source, items: data.items ?? [] });
    setFields(toFields(data));
    setServings(1);
    setEditing(false);
    if (data.description) setDescription(data.description);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const showError = (message) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const runPhoto = async (uri, note) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      if (!imageRef.current || imageRef.current.uri !== uri) {
        imageRef.current = { uri, image: await prepareFoodPhoto(uri) };
      }
    } catch {
      setLoading(false);
      showError('Could not read that photo');
      return;
    }
    const { image } = imageRef.current;
    if (!note && !(await isOnline())) return saveForLater({ image });
    const res = await analyzeFoodPhoto(image, note);
    if (id !== requestId.current) return; // a newer photo replaced this one
    if (res.offline && !note) return saveForLater({ image });
    setLoading(false);
    if (res.ok) applyResult(res.data);
    else showError(res.error || 'Could not analyze photo');
  };

  useEffect(() => {
    if (photoUri) runPhoto(photoUri);
    // Only when a new photo arrives; re-runs with a note go through runPhoto directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUri]);

  const handlePick = async (source) => {
    const uri = await pickFoodPhoto(source);
    if (!uri) return;
    setResult(null);
    setFixNote('');
    setPhotoUri(uri);
  };

  const handleEstimateText = async () => {
    const text = description.trim();
    if (!text) return;
    if (!(await isOnline())) return saveForLater({ text });
    requestId.current++;
    setLoading(true);
    setError(null);
    const res = await extractFood(text);
    if (res.offline) return saveForLater({ text });
    setLoading(false);
    if (res.ok && res.data) applyResult(res.data);
    else showError(res.error || 'Could not get macros');
  };

  const handleReset = () => {
    requestId.current++;
    setPhotoUri(null);
    setResult(null);
    setDescription('');
    setFixNote('');
    setError(null);
    setLoading(false);
  };

  const scaled = (key) => Math.round((parseInt(fields[key], 10) || 0) * servings);

  const changeServings = (delta) => {
    Haptics.selectionAsync();
    setServings((s) => Math.max(SERVING_STEP, s + delta));
  };

  const handleSave = () => {
    if (celebrate) return;
    const portion = result?.portion
      ? `${result.portion}${servings !== 1 ? ` × ${servings}` : ''}`
      : undefined;
    const payload = {
      id: generateId(),
      type: EVENT_TYPES.food,
      date: formatDateKey(new Date()),
      time: getTimeNow24h(),
      description: description.trim() || 'Meal',
      calories: scaled('calories'),
      protein: scaled('protein'),
      carbs: scaled('carbs'),
      fat: scaled('fat'),
      note: portion,
    };
    dispatch({ type: 'ADD_EVENT', payload });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebrate({ calories: payload.calories, streak: foodStreak([payload, ...events], payload.date) });
    leaveTimer.current = setTimeout(() => navigation.goBack(), CELEBRATE_MS);
  };

  const inputStyle = [text.body, styles.input, { backgroundColor: palette.fill }];

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
          accessibilityLabel="Cancel"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="chevron-back" size={26} color={palette.label} />
        </Pressable>
        <Text style={text.title2}>log food.</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {photoUri ? (
          <Animated.View style={[styles.photoWrap, photoStyle]}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            {loading && <ScanOverlay key={requestId.current} />}
          </Animated.View>
        ) : null}

        {!photoUri && !result && (
          <>
            <View style={styles.pickRow}>
              {[
                { source: 'camera', icon: 'camera', label: 'Take photo' },
                { source: 'library', icon: 'images', label: 'Upload' },
              ].map((b) => (
                <Pressable
                  key={b.source}
                  accessibilityRole="button"
                  onPress={() => handlePick(b.source)}
                  style={({ pressed }) => [
                    styles.pickTile,
                    { backgroundColor: palette.card },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name={b.icon} size={28} color={palette.green} />
                  <Text style={text.subheadline}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[text.eyebrow, styles.label]}>{'Or describe it'.toUpperCase()}</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. Oatmeal with banana"
              placeholderTextColor={palette.tertiaryLabel}
              value={description}
              onChangeText={setDescription}
              returnKeyType="go"
              onSubmitEditing={handleEstimateText}
              editable={!loading}
            />
            {loading && (
              <View style={styles.textScan}>
                <ScanOverlay key={requestId.current} stages={TEXT_STAGES} />
              </View>
            )}
          </>
        )}

        {error ? (
          <Text style={[text.footnote, styles.errorText, { color: palette.red }]}>{error}</Text>
        ) : null}

        {showingResult && (
          <>
            <Animated.View entering={FadeInDown.duration(350)}>
              <TextInput
                style={[text.title3, styles.nameInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Meal name"
                placeholderTextColor={palette.tertiaryLabel}
              />
              <View style={styles.metaRow}>
                {result.portion ? <Text style={text.footnote}>{result.portion}</Text> : null}
                {SOURCE_LABELS[result.source] ? (
                  <View style={[styles.chip, { backgroundColor: palette.fill }]}>
                    <Text style={text.caption}>{SOURCE_LABELS[result.source]}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            <NutritionReveal
              calories={scaled('calories')}
              protein={scaled('protein')}
              carbs={scaled('carbs')}
              fat={scaled('fat')}
              palette={palette}
              text={text}
            />

            {result.items.length > 1 &&
              result.items.map((item, i) => (
                <Animated.View
                  key={`${item.name}-${i}`}
                  entering={FadeInDown.delay(650 + i * 90).springify()}
                  style={styles.itemRow}
                >
                  <Text style={[text.footnote, styles.itemName]} numberOfLines={1}>
                    {item.name} · {item.portion}
                  </Text>
                  <Text style={text.footnote}>{item.calories} cal</Text>
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
                {MACROS.map(({ key, label }) => (
                  <View key={key} style={styles.macroCell}>
                    <Text style={[text.eyebrow, styles.label]}>{label.toUpperCase()}</Text>
                    <TextInput
                      style={inputStyle}
                      value={servings === 1 ? fields[key] : String(scaled(key))}
                      onChangeText={(v) => setFields((f) => ({ ...f, [key]: v }))}
                      editable={servings === 1}
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

            {photoUri ? (
              <View style={styles.fixRow}>
                <TextInput
                  style={[text.subheadline, styles.input, styles.fixInput, { backgroundColor: palette.fill }]}
                  placeholder="Something off? e.g. it was a large"
                  placeholderTextColor={palette.tertiaryLabel}
                  value={fixNote}
                  onChangeText={setFixNote}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Re-analyze with note"
                  disabled={!fixNote.trim()}
                  onPress={() => runPhoto(photoUri, fixNote.trim())}
                  style={({ pressed }) => [(pressed || !fixNote.trim()) && styles.pressed]}
                >
                  <Ionicons name="refresh-circle" size={40} color={palette.tint} />
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {(showingResult || (!photoUri && !loading)) && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: result ? palette.green : palette.label },
              !result && !description.trim() && styles.disabled,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={result ? handleSave : handleEstimateText}
            disabled={!result && !description.trim()}
          >
            <Text style={[text.headline, { color: result ? '#FFFFFF' : palette.background }]}>
              {result ? `Log it · ${scaled('calories')} kcal` : 'Estimate'}
            </Text>
          </Pressable>
        )}

        {(showingResult || error) && (
          <Pressable accessibilityRole="button" onPress={handleReset} style={styles.resetLink}>
            <Text style={[text.subheadline, { color: palette.tint }]}>Start over</Text>
          </Pressable>
        )}
      </ScrollView>

      {celebrate && <LoggedCelebration calories={celebrate.calories} streak={celebrate.streak} />}
    </View>
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
  label: {
    marginBottom: 8,
  },
  input: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  photoWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  textScan: {
    height: 170,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#07170D',
    marginBottom: 16,
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
  resetLink: {
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
