import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../store/ThemeContext';
import { fonts } from '../../theme/ios';

const MIN_WEIGHT = 50;
const MAX_WEIGHT = 500;

const ITEMS = Array.from({ length: MAX_WEIGHT - MIN_WEIGHT + 1 }, (_, i) => MIN_WEIGHT + i);

export default function WeightPicker({ value, onValueChange }) {
  const { palette } = useTheme();
  const numericValue = parseInt(value, 10) || 150;

  return (
    <View style={styles.container}>
      <Picker
        selectedValue={numericValue}
        onValueChange={(v) => onValueChange(String(v))}
        style={styles.picker}
        itemStyle={{
          fontFamily: fonts.displayBold,
          fontSize: 20,
          color: palette.label,
        }}
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
});
