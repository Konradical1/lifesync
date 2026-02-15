import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

const ICON_MAP = {
  sleep: 'moon-outline',
  food: 'restaurant-outline',
  exercise: 'fitness-outline',
  meds: 'medkit-outline',
  journal: 'document-text-outline',
  mood: 'happy-outline',
  nutrition: 'nutrition-outline',
  summary: 'sparkles-outline',
  progress: 'trending-up-outline',
};

/** Parse a line into segments: normal, bold, italic, blue, icon. Order: *** then ** then * then [icon:name]. */
function parseInlineSegments(text) {
  const segments = [];
  const re = /\*\*\*(.*?)\*\*\*|\*\*(.*?)\*\*|\*(.*?)\*|\[icon:(\w+)\]/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'normal', text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) segments.push({ type: 'blue', text: match[1] });
    else if (match[2] !== undefined) segments.push({ type: 'bold', text: match[2] });
    else if (match[3] !== undefined) segments.push({ type: 'italic', text: match[3] });
    else if (match[4] !== undefined) segments.push({ type: 'icon', name: match[4] });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'normal', text: text.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'normal', text: text }];
}

/** Strip [icon:name] from string and return { iconName, text }. */
function stripIconFromHeader(str) {
  const m = str.match(/^\[icon:(\w+)\]\s*(.*)$/);
  if (m) return { iconName: m[1], text: m[2].trim() };
  const m2 = str.match(/(.*?)\s*\[icon:(\w+)\]\s*(.*)$/);
  if (m2) return { iconName: m2[2], text: (m2[1] + ' ' + m2[3]).trim() };
  return { iconName: null, text: str };
}

function renderInlineSegments(segments, keyPrefix) {
  return (
    <View key={keyPrefix} style={styles.inlineRow}>
      {segments.map((s, i) => {
        if (s.type === 'icon') {
          const icon = ICON_MAP[s.name] || 'ellipse-outline';
          return (
            <Ionicons
              key={`${keyPrefix}-${i}`}
              name={icon}
              size={16}
              color={colors.textSecondary}
              style={styles.inlineIcon}
            />
          );
        }
        if (s.type === 'normal') return <Text key={`${keyPrefix}-${i}`} style={styles.body}>{s.text}</Text>;
        if (s.type === 'bold') return <Text key={`${keyPrefix}-${i}`} style={styles.bold}>{s.text}</Text>;
        if (s.type === 'italic') return <Text key={`${keyPrefix}-${i}`} style={styles.italic}>{s.text}</Text>;
        if (s.type === 'blue') return <Text key={`${keyPrefix}-${i}`} style={styles.highlight}>{s.text}</Text>;
        return null;
      })}
    </View>
  );
}

/** Render body with # big heading, ## / ### section headers, icons, and * / ** / *** emphasis. */
function renderFormattedBody(body) {
  const lines = (body || '').split(/\n/);
  const elements = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      const raw = trimmed.slice(4).trim();
      const { iconName, text } = stripIconFromHeader(raw);
      if (text || iconName) {
        elements.push(
          <View key={key++} style={styles.headerRow}>
            {iconName && (
              <Ionicons
                name={ICON_MAP[iconName] || 'ellipse-outline'}
                size={18}
                color={colors.textPrimary}
                style={styles.headerIcon}
              />
            )}
            <Text style={styles.subHeader}>{text}</Text>
          </View>
        );
      }
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const raw = trimmed.slice(3).trim();
      const { iconName, text } = stripIconFromHeader(raw);
      if (text || iconName) {
        elements.push(
          <View key={key++} style={styles.headerRow}>
            {iconName && (
              <Ionicons
                name={ICON_MAP[iconName] || 'ellipse-outline'}
                size={20}
                color={colors.textPrimary}
                style={styles.headerIcon}
              />
            )}
            <Text style={styles.sectionHeader}>{text}</Text>
          </View>
        );
      }
      continue;
    }
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      const raw = trimmed.slice(2).trim();
      const { iconName, text } = stripIconFromHeader(raw);
      if (text || iconName) {
        elements.push(
          <View key={key++} style={styles.headerRow}>
            {iconName && (
              <Ionicons
                name={ICON_MAP[iconName] || 'ellipse-outline'}
                size={24}
                color={colors.textPrimary}
                style={styles.headerIcon}
              />
            )}
            <Text style={styles.bigHeading}>{text}</Text>
          </View>
        );
      }
      continue;
    }
    if (!trimmed) {
      elements.push(<View key={key++} style={styles.paragraphGap} />);
      continue;
    }
    const segments = parseInlineSegments(line);
    elements.push(renderInlineSegments(segments, key++));
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
  bold: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 24,
    fontWeight: '700',
  },
  italic: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  highlight: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
    lineHeight: 24,
    fontWeight: '600',
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  inlineIcon: {
    marginHorizontal: spacing.xxs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerIcon: {
    marginRight: spacing.xs,
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
