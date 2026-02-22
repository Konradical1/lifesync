import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { SkeletonLines } from '../Home/SkeletonText';

const REVEAL_OFFSET = 10;
const REVEAL_DURATION = 380;
const REVEAL_STAGGER_MS = 42;
const CARD_STAGGER_MS = 50;

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
  // Allow optional space in [icon: name]; capture only inner text for *** ** * (no asterisks in capture)
  const re = /\*\*\*([^*]+?)\*\*\*|\*\*([^*]+?)\*\*|\*([^*]+?)\*|\[\s*icon\s*:\s*(\w+)\s*\]/gi;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'normal', text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) segments.push({ type: 'blue', text: String(match[1]).trim() });
    else if (match[2] !== undefined) segments.push({ type: 'bold', text: String(match[2]).trim() });
    else if (match[3] !== undefined) segments.push({ type: 'italic', text: String(match[3]).trim() });
    else if (match[4] !== undefined) segments.push({ type: 'icon', name: String(match[4]).trim().toLowerCase() });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'normal', text: text.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'normal', text: text }];
}

/** Flatten body into word-level segments (preserving bold/italic/blue). Newline segments force line break. */
function getBodyWordSegments(body) {
  if (!body || !body.trim()) return [];
  const out = [];
  const lines = body.split(/\n/);
  for (let li = 0; li < lines.length; li++) {
    const trimmed = lines[li].trim();
    if (trimmed === '') {
      out.push({ type: 'newline' });
      continue;
    }
    const segments = parseInlineSegments(trimmed);
    for (const seg of segments) {
      if (seg.type === 'icon') continue;
      const words = (seg.text || '').split(/\s+/).filter(Boolean);
      for (const word of words) {
        out.push({ type: seg.type, text: word });
      }
    }
    if (li < lines.length - 1) out.push({ type: 'newline' });
  }
  return out;
}

/** Strip [icon:name] or [icon: name] from string and return { iconName, text }. */
function stripIconFromHeader(str) {
  const m = str.match(/^\[\s*icon\s*:\s*(\w+)\s*\]\s*(.*)$/i);
  if (m) return { iconName: m[1].toLowerCase(), text: m[2].trim() };
  const m2 = str.match(/(.*?)\s*\[\s*icon\s*:\s*(\w+)\s*\]\s*(.*)$/i);
  if (m2) return { iconName: m2[2].toLowerCase(), text: (m2[1] + ' ' + m2[3]).trim() };
  return { iconName: null, text: str };
}

/** One Text with nested Text for bold/italic/blue so they stay inline (no extra line breaks). */
function renderTextRun(segments, keyPrefix, baseStyle) {
  return (
    <Text key={keyPrefix} style={baseStyle}>
      {segments.map((s, i) => {
        if (s.type === 'normal') return <Text key={`${keyPrefix}-${i}`} style={styles.body}>{s.text}</Text>;
        if (s.type === 'bold') return <Text key={`${keyPrefix}-${i}`} style={styles.bold}>{s.text}</Text>;
        if (s.type === 'italic') return <Text key={`${keyPrefix}-${i}`} style={styles.italic}>{s.text}</Text>;
        if (s.type === 'blue') return <Text key={`${keyPrefix}-${i}`} style={styles.highlight}>{s.text}</Text>;
        return null;
      })}
    </Text>
  );
}

/** Render segments inline: icons in a row, text runs as single Text so bold/italic/blue don't create new lines. */
function renderInlineSegments(segments, keyPrefix) {
  const hasIcon = segments.some((s) => s.type === 'icon');
  if (!hasIcon) {
    return renderTextRun(segments, keyPrefix, styles.inlineParagraph);
  }
  const runs = [];
  let currentTextRun = [];
  segments.forEach((s, i) => {
    if (s.type === 'icon') {
      if (currentTextRun.length) {
        runs.push({ type: 'text', segments: currentTextRun });
        currentTextRun = [];
      }
      runs.push({ type: 'icon', name: s.name });
    } else {
      currentTextRun.push(s);
    }
  });
  if (currentTextRun.length) runs.push({ type: 'text', segments: currentTextRun });

  return (
    <View key={keyPrefix} style={styles.inlineRow}>
      {runs.map((r, i) =>
        r.type === 'icon' ? (
          <Ionicons
            key={`${keyPrefix}-icon-${i}`}
            name={ICON_MAP[r.name] || 'ellipse-outline'}
            size={16}
            color={colors.textSecondary}
            style={styles.inlineIcon}
          />
        ) : (
          renderTextRun(r.segments, `${keyPrefix}-run-${i}`, styles.body)
        )
      )}
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
    const segments = parseInlineSegments(trimmed);
    elements.push(renderInlineSegments(segments, key++));
  }
  return elements;
}

export default function InsightCard({ title, body, highlight = '', formatted = false, iconName = null, placeholder = false, animTrigger = 0, sectionIndex = 0 }) {
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0 });
  const [segmentAnims, setSegmentAnims] = useState([]);
  const gradientId = `insight-${(iconName || title || '').replace(/\W/g, '')}`;
  const prevAnimTriggerRef = useRef(0);

  const wordSegments = useMemo(() => (body ? getBodyWordSegments(body) : []), [body]);

  useEffect(() => {
    if (placeholder || animTrigger <= 0 || wordSegments.length === 0) return;
    if (animTrigger === prevAnimTriggerRef.current) return;
    prevAnimTriggerRef.current = animTrigger;

    const values = wordSegments.map((seg) =>
      seg.type === 'newline'
        ? { opacity: new Animated.Value(1), translateY: new Animated.Value(0) }
        : { opacity: new Animated.Value(0), translateY: new Animated.Value(REVEAL_OFFSET) }
    );
    setSegmentAnims(values);

    const cardOffset = sectionIndex * CARD_STAGGER_MS;
    let wordIndex = 0;
    requestAnimationFrame(() => {
      values.forEach((v, i) => {
        if (wordSegments[i].type === 'newline') return;
        const delayMs = cardOffset + wordIndex * REVEAL_STAGGER_MS;
        wordIndex += 1;
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.parallel([
            Animated.timing(v.opacity, {
              toValue: 1,
              duration: REVEAL_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(v.translateY, {
              toValue: 0,
              duration: REVEAL_DURATION,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    });
  }, [animTrigger, sectionIndex, placeholder, wordSegments]);

  if (formatted) {
    const showGradient = cardLayout.width > 0 && cardLayout.height > 0;
    const icon = iconName ? (ICON_MAP[iconName] || ICON_MAP.summary) : null;
    const showWordReveal = !placeholder && animTrigger > 0 && segmentAnims.length === wordSegments.length && wordSegments.length > 0;

    const bodyContent = placeholder ? (
      <View style={styles.formattedBody}>
        <SkeletonLines widths={['100%', '88%', '60%']} gap={8} />
      </View>
    ) : showWordReveal ? (
      <View style={[styles.formattedBody, styles.wordRow]}>
        {wordSegments.map((seg, i) => {
          if (seg.type === 'newline') {
            return <View key={`nl-${i}`} style={styles.lineBreak} />;
          }
          const styleForType = seg.type === 'bold' ? styles.bold : seg.type === 'italic' ? styles.italic : seg.type === 'blue' ? styles.highlight : styles.body;
          return (
            <Animated.Text
              key={`${i}-${seg.text}`}
              style={[
                styles.wordSegment,
                styleForType,
                {
                  opacity: segmentAnims[i].opacity,
                  transform: [{ translateY: segmentAnims[i].translateY }],
                },
              ]}
            >
              {seg.text}{i < wordSegments.length - 1 && wordSegments[i + 1].type !== 'newline' ? ' ' : ''}
            </Animated.Text>
          );
        })}
      </View>
    ) : (
      <View style={styles.formattedBody}>
        {renderFormattedBody(body)}
      </View>
    );
    return (
      <View
        style={styles.card}
        onLayout={(e) => setCardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {showGradient && (
          <Svg style={styles.cardGradientSvg} width={cardLayout.width} height={cardLayout.height} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0d1014" />
                <Stop offset="100%" stopColor={colors.surface} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={cardLayout.width} height={cardLayout.height} fill={`url(#${gradientId})`} rx={borderRadius.md} ry={borderRadius.md} />
          </Svg>
        )}
        {icon && (
          <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.cardIcon} />
        )}
        <View style={styles.cardContent}>
          <Text style={styles.title}>{title}</Text>
          {bodyContent}
        </View>
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
    <View style={[styles.card, styles.cardPlain]}>
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
    position: 'relative',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardGradientSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    opacity: 0.4,
    zIndex: 1,
  },
  cardContent: {
    zIndex: 1,
  },
  cardPlain: {
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bold: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  italic: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  highlight: {
    ...typography.body,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.accent,
    lineHeight: 24,
  },
  inlineParagraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xxs,
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
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  wordSegment: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  lineBreak: {
    width: '100%',
    height: 0,
  },
  bigHeading: {
    ...typography.title2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  sectionHeader: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  subHeader: {
    ...typography.callout,
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  paragraphGap: {
    height: spacing.sm,
  },
});
