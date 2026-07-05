import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';

export default function WeightCard({ weight, weightGoal, onUpdateWeight, onViewHistory }) {
  const { palette, text, shape } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, borderCurve: shape.borderCurve },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="scale-outline"
              size={18}
              color={palette.secondaryLabel}
            />
            <Text style={[text.subheadline, { color: palette.secondaryLabel }]}>
              Weight
            </Text>
          </View>
        </View>

        <View style={styles.valueRow}>
          <Text style={text.statValue}>{weight ? `${weight} lbs` : '—'}</Text>
          {weightGoal ? (
            <Text style={text.footnote}>Goal: {weightGoal} lbs</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.label }]}
            activeOpacity={0.8}
            onPress={onUpdateWeight}
          >
            <Ionicons name="create-outline" size={16} color={palette.background} />
            <Text style={[text.subheadline, { color: palette.background }]}>
              Update weight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.fill }]}
            activeOpacity={0.7}
            onPress={onViewHistory}
          >
            <Ionicons name="trending-up-outline" size={16} color={palette.tint} />
            <Text style={[text.subheadline, { color: palette.tint }]}>
              Weight history
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
  },
});
