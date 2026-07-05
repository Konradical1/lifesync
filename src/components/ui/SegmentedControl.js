import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

/** Generic iOS-style segmented control. options: [{ key, label }]. */
export default function SegmentedControl({ options, value, onChange, accessibilityLabel }) {
  const { palette, text, shape } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: palette.fill, borderRadius: shape.controlRadius }]}
    >
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              { borderRadius: shape.controlRadius - 2 },
              selected && { backgroundColor: palette.card },
            ]}
          >
            <Text
              style={[
                text.subheadline,
                { color: selected ? palette.label : palette.secondaryLabel },
                selected && styles.selectedLabel,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectedLabel: {
    fontWeight: '600',
  },
});
