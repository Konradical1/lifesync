import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';
import { extractFood } from '../../api/ai';

const CTA_HEIGHT = 48;
const CONTROL_RADIUS = 14;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export default function FoodEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette, text } = useTheme();
  const { dispatch } = useStore();

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (saved) {
      navigation.goBack();
      return;
    }
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    const result = await extractFood(description.trim());
    setLoading(false);
    if (result.ok && result.data) {
      setExtracted(result.data);
      setCalories(String(result.data.calories ?? 0));
      setProtein(String(result.data.protein ?? 0));
      setCarbs(String(result.data.carbs ?? 0));
      if (result.data.description) setDescription(result.data.description);
    } else {
      setError(result.error || 'Could not get macros');
      setExtracted({ calories: 0, protein: 0, carbs: 0 });
      setCalories('');
      setProtein('');
      setCarbs('');
    }
  };

  const handleFinalSave = () => {
    const date = formatDateKey(new Date());
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        type: EVENT_TYPES.food,
        date,
        time: getTimeNow24h(),
        description: description.trim(),
        calories: parseInt(calories, 10) || 0,
        protein: parseInt(protein, 10) || 0,
        carbs: parseInt(carbs, 10) || 0,
      },
    });
    setSaved(true);
    navigation.goBack();
  };

  const saveDisabled = loading || !description.trim();
  const inputStyle = [
    text.body,
    styles.input,
    { backgroundColor: palette.fill },
  ];

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
      <View style={styles.content}>
        <Text style={[text.eyebrow, styles.label]}>
          {'What did you eat?'.toUpperCase()}
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. Oatmeal with banana"
          placeholderTextColor={palette.tertiaryLabel}
          value={description}
          onChangeText={setDescription}
          editable={!extracted}
        />
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.tint} />
            <Text style={text.footnote}>Extracting nutrition…</Text>
          </View>
        )}
        {error ? (
          <Text style={[text.footnote, styles.errorText, { color: palette.red }]}>
            {error}
          </Text>
        ) : null}
        {extracted && !loading && (
          <View style={styles.nutrients}>
            <Text style={[text.eyebrow, styles.label]}>
              {'Calories'.toUpperCase()}
            </Text>
            <TextInput
              style={inputStyle}
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
            />
            <Text style={[text.eyebrow, styles.label]}>
              {'Protein (g)'.toUpperCase()}
            </Text>
            <TextInput
              style={inputStyle}
              value={protein}
              onChangeText={setProtein}
              keyboardType="number-pad"
            />
            <Text style={[text.eyebrow, styles.label]}>
              {'Carbs (g)'.toUpperCase()}
            </Text>
            <TextInput
              style={inputStyle}
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="number-pad"
            />
          </View>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.saveButton,
            { backgroundColor: palette.label },
            saveDisabled && styles.disabled,
          ]}
          onPress={extracted ? handleFinalSave : handleSave}
          disabled={saveDisabled}
        >
          <Text style={[text.headline, { color: palette.background }]}>
            {extracted ? 'Save' : 'Extract & Save'}
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  errorText: {
    marginBottom: 12,
  },
  nutrients: {
    marginBottom: 4,
  },
  saveButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
