import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import { useTheme } from '../../store/ThemeContext';

const STATS_CONFIG = [
  { key: 'calorieGoal', label: 'Calories', icon: 'flame-outline', unit: 'cal' },
  { key: 'proteinGoal', label: 'Protein', icon: 'barbell-outline', unit: 'g' },
  { key: 'waterGoalOz', label: 'Water', icon: 'water-outline', unit: 'oz' },
];

export default function QuickStatsRow({ profile, onEditField }) {
  const { palette, text, shape } = useTheme();

  const statColors = {
    calorieGoal: EVENT_TYPE_COLORS.food,
    proteinGoal: EVENT_TYPE_COLORS.exercise,
    waterGoalOz: palette.cyan,
  };

  return (
    <View style={styles.container}>
      {STATS_CONFIG.map(({ key, label, icon, unit }) => {
        const value = profile[key];
        const color = statColors[key];
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.chip,
              {
                backgroundColor: palette.card,
                borderCurve: shape.borderCurve,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => onEditField(key)}
          >
            <Ionicons name={icon} size={18} color={color} style={styles.chipIcon} />
            <Text style={[text.title3, { color }]}>{value || '—'}</Text>
            <Text
              style={[
                text.caption,
                styles.chipLabel,
                { color: palette.tertiaryLabel },
              ]}
            >
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
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  chipIcon: {
    marginBottom: 4,
  },
  chipLabel: {
    marginTop: 2,
  },
});
