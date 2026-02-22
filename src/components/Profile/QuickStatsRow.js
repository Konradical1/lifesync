import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

const STATS_CONFIG = [
  { key: 'calorieGoal', label: 'Calories', icon: 'flame-outline', unit: 'cal', color: colors.eventFood },
  { key: 'proteinGoal', label: 'Protein', icon: 'barbell-outline', unit: 'g', color: colors.eventExercise },
  { key: 'waterGoalOz', label: 'Water', icon: 'water-outline', unit: 'oz', color: colors.water },
];

export default function QuickStatsRow({ profile, onEditField }) {
  return (
    <View style={styles.container}>
      {STATS_CONFIG.map(({ key, label, icon, unit, color }) => {
        const value = profile[key];
        return (
          <TouchableOpacity
            key={key}
            style={styles.chip}
            activeOpacity={0.7}
            onPress={() => onEditField(key)}
          >
            <Ionicons name={icon} size={18} color={color} style={styles.chipIcon} />
            <Text style={[styles.chipValue, { color }]}>
              {value || '—'}
            </Text>
            <Text style={styles.chipLabel}>
              {unit} {label.toLowerCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  chipIcon: {
    marginBottom: spacing.xxs,
  },
  chipValue: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    fontFamily: typography.fontFamilyBold,
  },
  chipLabel: {
    fontSize: typography.caption2.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
