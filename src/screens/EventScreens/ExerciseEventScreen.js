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

const CTA_HEIGHT = 48;
const CONTROL_RADIUS = 14;
const CHIP_HEIGHT = 36;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

// Mock AI calories
function mockExtractCalories(description, duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const base = (description || '').toLowerCase().includes('run') ? 10 : 5;
      resolve(Math.round((duration || 30) * base));
    }, 600);
  });
}

export default function ExerciseEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette, text } = useTheme();
  const { dispatch } = useStore();

  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [calories, setCalories] = useState('');
  const [extracted, setExtracted] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    if (extracted) {
      const date = formatDateKey(new Date());
      dispatch({
        type: 'ADD_EVENT',
        payload: {
          id: generateId(),
          type: EVENT_TYPES.exercise,
          date,
          time: getTimeNow24h(),
          description: description.trim(),
          duration,
          calories: parseInt(calories, 10) || 0,
        },
      });
      navigation.goBack();
      return;
    }
    setLoading(true);
    const c = await mockExtractCalories(description, duration);
    setLoading(false);
    setCalories(String(c));
    setExtracted(true);
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
        <Text style={text.title2}>log exercise.</Text>
      </View>
      <View style={styles.content}>
        <Text style={[text.eyebrow, styles.label]}>
          {'What did you do?'.toUpperCase()}
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 30 min run"
          placeholderTextColor={palette.tertiaryLabel}
          value={description}
          onChangeText={setDescription}
        />
        <Text style={[text.eyebrow, styles.label]}>
          {'Duration (minutes)'.toUpperCase()}
        </Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const isActive = duration === d;
            return (
              <TouchableOpacity
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.durationChip,
                  { backgroundColor: isActive ? palette.label : palette.fill },
                ]}
                onPress={() => setDuration(d)}
              >
                <Text
                  style={[
                    text.subheadline,
                    isActive && { color: palette.background },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.tint} />
            <Text style={text.footnote}>Estimating calories…</Text>
          </View>
        )}
        {extracted && !loading && (
          <View style={styles.caloriesSection}>
            <Text style={[text.eyebrow, styles.label]}>
              {'Calories (editable)'.toUpperCase()}
            </Text>
            <TextInput
              style={inputStyle}
              value={calories}
              onChangeText={setCalories}
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
          onPress={handleSave}
          disabled={saveDisabled}
        >
          <Text style={[text.headline, { color: palette.background }]}>
            Save
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
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  durationChip: {
    height: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  caloriesSection: {
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
