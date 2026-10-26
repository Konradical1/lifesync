import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';

const FIELDS = [
  { key: 'aiContext', label: 'AI Context', placeholder: 'Give the AI context about you…', isLargeField: true },
  { key: 'height', label: 'Height', placeholder: 'Not set' },
  { key: 'gender', label: 'Gender', placeholder: 'Not set' },
  { key: 'age', label: 'Age', placeholder: 'Not set' },
  { key: 'weightGoal', label: 'Weight Goal', placeholder: 'Not set', suffix: 'lbs' },
  { key: 'waterGoalOz', label: 'Water Goal', placeholder: 'Not set', suffix: 'oz' },
];

function FieldRow({ label, value, placeholder, suffix, onPress, isLast }) {
  const { palette, text } = useTheme();
  const displayValue = value
    ? suffix
      ? `${value} ${suffix}`
      : value
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.separator,
        },
      ]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <Text style={[text.subheadline, styles.rowLabel]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text
          style={[
            text.subheadline,
            styles.rowValue,
            {
              color: displayValue
                ? palette.secondaryLabel
                : palette.tertiaryLabel,
            },
          ]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={palette.tertiaryLabel}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function AboutYouSection({ profile, onEditField }) {
  const { palette, shape } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, borderCurve: shape.borderCurve },
        ]}
      >
        {FIELDS.map((field, idx) => (
          <FieldRow
            key={field.key}
            label={field.label}
            value={profile[field.key]}
            placeholder={field.placeholder}
            suffix={field.suffix}
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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: {
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '55%',
  },
  rowValue: {
    textAlign: 'right',
  },
});
