import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

export default function WeightCard({ weight, weightGoal, onUpdateWeight, onViewHistory }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Ionicons name="scale-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.title}>Weight</Text>
          </View>
        </View>

        <View style={styles.valueRow}>
          <Text style={styles.currentWeight}>
            {weight ? `${weight} lbs` : '—'}
          </Text>
          {weightGoal ? (
            <Text style={styles.goalText}>Goal: {weightGoal} lbs</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={onUpdateWeight}
          >
            <Ionicons name="create-outline" size={16} color={colors.background} />
            <Text style={styles.primaryButtonText}>Update weight</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.7}
            onPress={onViewHistory}
          >
            <Ionicons name="trending-up-outline" size={16} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Weight history</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currentWeight: {
    fontSize: typography.title1.fontSize,
    fontWeight: typography.title1.fontWeight,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  goalText: {
    fontSize: typography.footnote.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  primaryButtonText: {
    fontSize: typography.footnote.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamilySemiBold,
    color: colors.background,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.accent + '15',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  secondaryButtonText: {
    fontSize: typography.footnote.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamilySemiBold,
    color: colors.accent,
  },
});
