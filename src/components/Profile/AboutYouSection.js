import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

const FIELDS = [
  { key: 'aiContext', label: 'AI Context', placeholder: 'Give the AI context about you…', isLargeField: true },
  { key: 'height', label: 'Height', placeholder: 'Not set' },
  { key: 'gender', label: 'Gender', placeholder: 'Not set' },
  { key: 'age', label: 'Age', placeholder: 'Not set' },
  { key: 'weightGoal', label: 'Weight Goal', placeholder: 'Not set', suffix: 'lbs' },
  { key: 'calorieGoal', label: 'Calorie Goal', placeholder: 'Not set', suffix: 'cal' },
  { key: 'proteinGoal', label: 'Protein Goal', placeholder: 'Not set', suffix: 'g' },
  { key: 'waterGoalOz', label: 'Water Goal', placeholder: 'Not set', suffix: 'oz' },
];

function FieldRow({ label, value, placeholder, suffix, onPress, isFirst, isLast }) {
  const displayValue = value
    ? suffix
      ? `${value} ${suffix}`
      : value
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        !isLast && styles.rowBorder,
      ]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text
          style={[styles.rowValue, !displayValue && styles.rowPlaceholder]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function AboutYouSection({ profile, onEditField }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>About You</Text>
      <View style={styles.card}>
        {FIELDS.map((field, idx) => (
          <FieldRow
            key={field.key}
            label={field.label}
            value={profile[field.key]}
            placeholder={field.placeholder}
            suffix={field.suffix}
            isFirst={idx === 0}
            isLast={idx === FIELDS.length - 1}
            onPress={() => onEditField(field.key, field.isLargeField)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.footnote.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xxs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  rowFirst: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
  rowLast: {
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: typography.subhead.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
    maxWidth: '55%',
  },
  rowValue: {
    fontSize: typography.subhead.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  rowPlaceholder: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});
