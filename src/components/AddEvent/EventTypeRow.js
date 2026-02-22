import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { EVENT_TYPE_COLORS } from '../../theme/constants';

const SUBTITLES = {
  sleep: 'Log sleep start and end times',
  food: 'Log meals and snacks',
  exercise: 'Log workouts and activity',
  meds: 'Log medications and supplements',
  other: 'Log anything else',
};

export default function EventTypeRow({ type, iconName, label, subtitle: subtitleProp, tintColor: tintColorProp, onPress, style }) {
  const tintColor = tintColorProp ?? EVENT_TYPE_COLORS[type] ?? colors.accent;
  const subtitle = subtitleProp ?? SUBTITLES[type] ?? '';
  return (
    <TouchableOpacity
      style={[styles.row, { borderLeftColor: tintColor }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={iconName} size={24} color={tintColor} style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  icon: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
  },
  subtitleText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: colors.textTertiary,
  },
});
