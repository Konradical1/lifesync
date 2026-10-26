import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import { useTheme } from '../../store/ThemeContext';

// target: the dailyTargets key this goal falls back to when none is saved.
const STATS_CONFIG = [
  { key: 'calorieGoal', target: 'calories', label: 'Calories', icon: 'flame-outline', unit: 'cal' },
  { key: 'proteinGoal', target: 'protein', label: 'Protein', icon: 'barbell-outline', unit: 'g' },
  { key: 'waterGoalOz', label: 'Water', icon: 'water-outline', unit: 'oz' },
  { key: 'carbGoal', target: 'carbs', label: 'Carbs', icon: 'pizza-outline', unit: 'g' },
  { key: 'fatGoal', target: 'fat', label: 'Fat', icon: 'egg-outline', unit: 'g' },
  { key: 'fiberGoal', target: 'fiber', label: 'Fiber', icon: 'leaf-outline', unit: 'g' },
];

export default function QuickStatsRow({ profile, targets, onEditField }) {
  const { palette, text, shape } = useTheme();

  const statColors = {
    calorieGoal: EVENT_TYPE_COLORS.food,
    proteinGoal: EVENT_TYPE_COLORS.exercise,
    waterGoalOz: palette.cyan,
    carbGoal: palette.cyan,
    fatGoal: palette.purple,
    fiberGoal: palette.indigo,
  };

  return (
    <View style={styles.container}>
      {STATS_CONFIG.map(({ key, target, label, icon, unit }) => {
        // targets already prefers a saved goal; without one it is the
        // suggestion, shown dimmed to mean "auto".
        const value = target ? targets[target] : profile[key];
        const auto = target && !(parseInt(profile[key], 10) > 0);
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
            accessibilityRole="button"
            accessibilityLabel={`${label} goal, ${value ? `${value} ${unit}` : 'not set'}${auto ? ', suggested' : ''}`}
          >
            <Ionicons name={icon} size={18} color={color} style={styles.chipIcon} />
            <Text style={[text.title3, { color }, auto && styles.autoValue]}>{value || '—'}</Text>
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
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '30%', // three per row
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
  autoValue: {
    opacity: 0.5,
  },
});
