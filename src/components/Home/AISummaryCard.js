import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSummary, useLatestSummary } from '../../store/useStore';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AISummaryCard() {
  const today = formatDateKey(new Date());
  const summary = useSummary(today) ?? useLatestSummary(today);
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const fullText = summary ?? 'No data yet — start logging your day';
  const highlight = summary ? (summary.includes('balanced') ? 'balanced' : summary.includes('track') ? 'on track' : '') : 'start logging';
  const parts = highlight ? fullText.split(highlight) : [fullText];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={[styles.card, expanded && styles.cardExpanded]}
    >
      <Text style={styles.text} numberOfLines={expanded ? undefined : 2}>
        {parts[0]}
        {parts.length > 1 ? <Text style={styles.highlight}>{highlight}</Text> : null}
        {parts[1] ?? ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cardExpanded: {},
  text: {
    fontSize: typography.callout.fontSize,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  highlight: {
    color: colors.accent,
    fontWeight: '600',
  },
});
