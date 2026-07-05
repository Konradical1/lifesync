import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import { useTheme } from '../../store/ThemeContext';
import { fonts } from '../../theme/ios';
import { SkeletonLines } from '../Home/SkeletonText';

const REVEAL_OFFSET = 10;
const REVEAL_DURATION = 380;
const REVEAL_STAGGER_MS = 42;
const CARD_STAGGER_MS = 50;
const SCREEN_MARGIN = 20;
const CARD_GAP = 12;

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

/** Per-topic accent so each card's corner icon picks up a palette color. */
function getIconAccent(palette) {
  return {
    sleep: palette.indigo,
    food: palette.green,
    nutrition: palette.green,
    exercise: palette.orange,
    meds: palette.red,
    journal: palette.purple,
    mood: palette.pink,
    summary: palette.tint,
    progress: palette.cyan,
  };
}

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
function renderTextRun(segments, keyPrefix, baseStyle, ts) {
  return (
    <Text key={keyPrefix} style={baseStyle}>
      {segments.map((s, i) => {
        if (s.type === 'normal') return <Text key={`${keyPrefix}-${i}`} style={ts.body}>{s.text}</Text>;
        if (s.type === 'bold') return <Text key={`${keyPrefix}-${i}`} style={ts.bold}>{s.text}</Text>;
        if (s.type === 'italic') return <Text key={`${keyPrefix}-${i}`} style={ts.italic}>{s.text}</Text>;
        if (s.type === 'blue') return <Text key={`${keyPrefix}-${i}`} style={ts.highlight}>{s.text}</Text>;
        return null;
      })}
    </Text>
  );
}

/** Render segments inline: icons in a row, text runs as single Text so bold/italic/blue don't create new lines. */
function renderInlineSegments(segments, keyPrefix, ts, palette) {
  const hasIcon = segments.some((s) => s.type === 'icon');
  if (!hasIcon) {
    return renderTextRun(segments, keyPrefix, ts.inlineParagraph, ts);
  }
  const runs = [];
  let currentTextRun = [];
  segments.forEach((s) => {
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
            color={palette.secondaryLabel}
            style={styles.inlineIcon}
          />
        ) : (
          renderTextRun(r.segments, `${keyPrefix}-run-${i}`, ts.body, ts)
        )
      )}
    </View>
  );
}

/** Render body with # big heading, ## / ### section headers, icons, and * / ** / *** emphasis. */
function renderFormattedBody(body, ts, palette) {
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
                size={16}
                color={palette.label}
                style={styles.headerIcon}
              />
            )}
            <Text style={ts.subHeader}>{text}</Text>
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
                size={18}
                color={palette.label}
                style={styles.headerIcon}
              />
            )}
            <Text style={ts.sectionHeader}>{text}</Text>
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
                size={20}
                color={palette.label}
                style={styles.headerIcon}
              />
            )}
            <Text style={ts.bigHeading}>{text}</Text>
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
    elements.push(renderInlineSegments(segments, key++, ts, palette));
  }
  return elements;
}

/** Theme-derived text styles; body copy in Tanseek, emphasis via Tanseek Medium, accents via palette.tint. */
function buildThemedTextStyles(palette, text) {
  return {
    body: { ...text.body },
    bold: { ...text.body, fontFamily: fonts.bodyMedium },
    italic: { ...text.body, fontStyle: 'italic' },
    highlight: { ...text.body, fontFamily: fonts.bodyMedium, color: palette.tint },
    inlineParagraph: { ...text.body, marginBottom: 2 },
    bigHeading: { ...text.title3, marginBottom: 8 },
    sectionHeader: { ...text.headline, marginTop: 12, marginBottom: 6 },
    subHeader: { ...text.subheadline, marginTop: 8, marginBottom: 2 },
  };
}

/**
 * Unified insight card: eyebrow title + optional accent icon on the first row,
 * body copy beneath. Same anatomy for AI sections, placeholders, and plain cards.
 */
export default function InsightCard({ title, body, highlight = '', formatted = false, iconName = null, placeholder = false, animTrigger = 0, sectionIndex = 0 }) {
  const { palette, text } = useTheme();
  const [segmentAnims, setSegmentAnims] = useState([]);
  const prevAnimTriggerRef = useRef(0);

  const ts = useMemo(() => buildThemedTextStyles(palette, text), [palette, text]);
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

  const icon = iconName ? (ICON_MAP[iconName] || ICON_MAP.summary) : null;
  const iconTint = iconName ? (getIconAccent(palette)[iconName] || palette.tint) : palette.tint;
  const showWordReveal =
    !placeholder &&
    animTrigger > 0 &&
    segmentAnims.length === wordSegments.length &&
    wordSegments.length > 0;

  let bodyContent;
  if (placeholder) {
    bodyContent = (
      <View style={styles.bodyWrap}>
        <SkeletonLines widths={['100%', '88%', '60%']} gap={8} />
      </View>
    );
  } else if (showWordReveal) {
    bodyContent = (
      <View style={[styles.bodyWrap, styles.wordRow]}>
        {wordSegments.map((seg, i) => {
          if (seg.type === 'newline') {
            return <View key={`nl-${i}`} style={styles.lineBreak} />;
          }
          const styleForType =
            seg.type === 'bold' ? ts.bold : seg.type === 'italic' ? ts.italic : seg.type === 'blue' ? ts.highlight : ts.body;
          return (
            <Animated.Text
              key={`${i}-${seg.text}`}
              style={[
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
    );
  } else if (formatted) {
    bodyContent = <View style={styles.bodyWrap}>{renderFormattedBody(body, ts, palette)}</View>;
  } else {
    const safeBody = body || '';
    const parts = highlight ? safeBody.split(highlight) : [safeBody];
    const segments = [];
    for (let i = 0; i < parts.length; i++) {
      segments.push({ key: `t${i}`, text: parts[i], highlight: false });
      if (i < parts.length - 1) {
        segments.push({ key: `h${i}`, text: highlight, highlight: true });
      }
    }
    bodyContent = (
      <View style={styles.bodyWrap}>
        <Text style={ts.body}>
          {segments.map((s) =>
            s.highlight ? (
              <Text key={s.key} style={ts.highlight}>
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

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text style={text.eyebrow}>{(title || '').toUpperCase()}</Text>
        {icon && <Ionicons name={icon} size={16} color={iconTint} />}
      </View>
      {bodyContent}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: CARD_GAP,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bodyWrap: {
    marginTop: 10,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  lineBreak: {
    width: '100%',
    height: 0,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 2,
  },
  inlineIcon: {
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerIcon: {
    marginRight: 6,
  },
  paragraphGap: {
    height: 8,
  },
});
