import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

/** Split text by **...** into segments; odd-indexed segments are highlighted. */
function parseHighlightSegments(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    segments.push({ key: `s${i}`, text: parts[i], highlight: i % 2 === 1 });
  }
  return segments;
}

/** Render body with # big heading, ## / ### section headers, and **highlighted** text in blue. */
function renderFormattedBody(body) {
  const lines = (body || '').split(/\n/);
  const elements = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      const subText = trimmed.slice(4).trim();
      if (subText) {
        elements.push(
          <Text key={key++} style={styles.subHeader}>
            {subText}
          </Text>
        );
      }
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const headerText = trimmed.slice(3).trim();
      if (headerText) {
        elements.push(
          <Text key={key++} style={styles.sectionHeader}>
            {headerText}
          </Text>
        );
      }
      continue;
    }
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      const bigHeading = trimmed.slice(2).trim();
      if (bigHeading) {
        elements.push(
          <Text key={key++} style={styles.bigHeading}>
            {bigHeading}
          </Text>
        );
      }
      continue;
    }
    if (!trimmed) {
      elements.push(<View key={key++} style={styles.paragraphGap} />);
      continue;
    }
    const segments = parseHighlightSegments(line);
    elements.push(
      <Text key={key++} style={styles.body}>
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
    );
  }
  return elements;
}

export default function InsightCard({ title, body, highlight = '', formatted = false }) {
  if (formatted) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.formattedBody}>{renderFormattedBody(body)}</View>
      </View>
    );
  }

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
  formattedBody: {
    marginTop: spacing.xs,
  },
  bigHeading: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  sectionHeader: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  subHeader: {
    fontSize: typography.callout.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  paragraphGap: {
    height: spacing.xs,
  },
});
