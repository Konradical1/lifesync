import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, typography } from '../../theme/constants';

const MIN_WEIGHT = 50;
const MAX_WEIGHT = 500;

const ITEMS = Array.from({ length: MAX_WEIGHT - MIN_WEIGHT + 1 }, (_, i) => MIN_WEIGHT + i);

export default function WeightPicker({ value, onValueChange }) {
  const numericValue = parseInt(value, 10) || 150;

  return (
    <View style={styles.container}>
      <Picker
        selectedValue={numericValue}
        onValueChange={(v) => onValueChange(String(v))}
        style={styles.picker}
        itemStyle={styles.pickerItem}
      >
        {ITEMS.map((n) => (
          <Picker.Item key={n} label={`${n} lbs`} value={n} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
  },
  picker: {
    width: '100%',
  },
  pickerItem: {
    fontSize: typography.title3.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
