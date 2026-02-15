import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { extractFood } from '../../api/ai';

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Food</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>What did you eat?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Oatmeal with banana"
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          editable={!extracted}
        />
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Extracting nutrition…</Text>
          </View>
        )}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        {extracted && !loading && (
          <View style={styles.nutrients}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.smallInput}
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Protein (g)</Text>
            <TextInput
              style={styles.smallInput}
              value={protein}
              onChangeText={setProtein}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.smallInput}
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="number-pad"
            />
          </View>
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={extracted ? handleFinalSave : handleSave}
          disabled={loading || !description.trim()}
        >
          <Text style={styles.saveButtonText}>
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
  errorText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  nutrients: {
    marginBottom: spacing.md,
  },
  smallInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
