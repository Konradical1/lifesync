import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HealthNotesCard({ medicalConditions, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      Animated.timing(rotateAnim, {
        toValue: prev ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return !prev;
    });
  }, [rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const hasNotes = medicalConditions && medicalConditions.trim().length > 0;
  const summary = hasNotes
    ? medicalConditions.trim().split('\n')[0].slice(0, 80) +
      (medicalConditions.trim().length > 80 ? '…' : '')
    : 'No health notes added';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={hasNotes ? toggleExpand : onEdit}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="medical-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.title}>Health Notes</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
            {hasNotes && (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
              </Animated.View>
            )}
          </View>
        </View>

        {hasNotes && !expanded && (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        )}

        {hasNotes && expanded && (
          <Text style={styles.fullText}>{medicalConditions.trim()}</Text>
        )}

        {!hasNotes && (
          <Text style={styles.placeholder}>
            Tap to add medical conditions, allergies, or medications
          </Text>
        )}
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textSecondary,
  },
  summary: {
    fontSize: typography.footnote.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  fullText: {
    fontSize: typography.subhead.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  placeholder: {
    fontSize: typography.footnote.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
