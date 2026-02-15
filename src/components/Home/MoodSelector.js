import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useStore, useMood } from '../../store/useStore';
import { MOOD_OPTIONS } from '../../store/mockData';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const INTENSITY_LEVELS = [1, 2, 3, 4, 5];

export default function MoodSelector() {
  const today = formatDateKey(new Date());
  const saved = useMood(today);
  const { dispatch } = useStore();
  const [emotion, setEmotion] = useState(saved?.emotion ?? 'neutral');
  const [intensity, setIntensity] = useState(saved?.intensity ?? 3);

  useEffect(() => {
    setEmotion(saved?.emotion ?? 'neutral');
    setIntensity(saved?.intensity ?? 3);
  }, [saved?.emotion, saved?.intensity]);

  const handleSave = () => {
    dispatch({
      type: 'SET_MOOD',
      payload: { date: today, emotion, intensity },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Current <Text style={styles.labelHighlight}>Mood</Text></Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MOOD_OPTIONS.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setEmotion(m.id)}
            style={[styles.chip, emotion === m.id && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, emotion === m.id && styles.chipLabelActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.intensityRow}>
        <View style={styles.intensitySlider}>
          <Text style={styles.intensityLabel}>Intensity</Text>
          {INTENSITY_LEVELS.map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setIntensity(i)}
              style={[styles.intensityDot, intensity === i && styles.intensityDotActive]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save mood</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelHighlight: {
    color: colors.accent,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  chipLabel: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.accent,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  intensitySlider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intensityLabel: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    marginRight: spacing.xs,
  },
  intensityDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  intensityDotActive: {
    backgroundColor: colors.accent,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.background,
  },
});
