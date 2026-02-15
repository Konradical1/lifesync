import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

export default function InsightCard({ title, body, highlight = '' }) {
  const parts = highlight ? body.split(highlight) : [body];
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    segments.push({ key: `t${i}`, text: parts[i], highlight: false });
    if (i < parts.length - 1) {
      segments.push({ key: `h${i}`, text: highlight, highlight: true });
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>
        {segments.map((s) =>
          s.highlight ? (
            <Text key={s.key} style={styles.highlight}>
              {s.text}
            </Text>
          ) : (
            s.text
          )
        )}
      </Text>
    </View>
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
  title: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  highlight: {
    color: colors.accent,
    fontWeight: '600',
  },
});
