import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Exercise</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>What did you do?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 30 min run"
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
        />
        <Text style={styles.label}>Duration (minutes)</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.durationChip, duration === d && styles.durationChipActive]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Estimating calories…</Text>
          </View>
        )}
        {extracted && !loading && (
          <View style={styles.caloriesRow}>
            <Text style={styles.label}>Calories (editable)</Text>
            <TextInput
              style={styles.smallInput}
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
            />
          </View>
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading || !description.trim()}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  durationChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  durationChipActive: {
    backgroundColor: colors.accent,
  },
  durationText: {
    fontSize: typography.subhead.fontSize,
    color: colors.textPrimary,
  },
  durationTextActive: {
    color: colors.background,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  caloriesRow: {
    marginBottom: spacing.md,
  },
  smallInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.background,
  },
});
