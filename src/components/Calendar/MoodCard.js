import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime12h } from '../../utils/time';
import { MOOD_OPTIONS } from '../../store/mockData';
import { useTheme } from '../../store/ThemeContext';
import { fonts } from '../../theme/ios';

function getMoodLabel(id) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.label ?? id;
}

function getMoodColor(id, fallback) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.color ?? fallback;
}

export default function MoodCard({ mood, compact = false, horizontal = false, showBar = true, fillHeight = false }) {
  const { palette, text } = useTheme();
  const color = getMoodColor(mood.emotion, palette.secondaryLabel);
  const startTime = mood.startTime ?? mood.time ?? '00:00';
  const endTime = mood.endTime ?? '';

  const timeRange = endTime ? `${formatTime12h(startTime)}–${formatTime12h(endTime)}` : formatTime12h(startTime);

  return (
    <View style={[
      styles.card,
      { backgroundColor: palette.card },
      compact && styles.cardCompact,
      horizontal && styles.cardHorizontal,
      fillHeight && styles.cardFill,
    ]}>
      {showBar && <View style={[styles.bar, { backgroundColor: color }]} />}
      <View style={[
        styles.content,
        horizontal && styles.contentRow,
        fillHeight && styles.contentFill,
      ]}>
        {horizontal ? (
          <>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text
              style={[text.caption, styles.labelInline, { color: palette.label }]}
              numberOfLines={1}
            >
              {getMoodLabel(mood.emotion)}
            </Text>
            <Text style={[styles.timeInline, { color }]}>{timeRange}</Text>
          </>
        ) : (
          <>
            <Text style={[text.caption, styles.time, { color }]}>{timeRange}</Text>
            <Text style={[text.subheadline, { color: palette.label }]}>
              {getMoodLabel(mood.emotion)}
            </Text>
            {mood.intensity != null && (
              <Text style={[styles.intensity, { color: palette.tertiaryLabel }]}>
                Intensity: {mood.intensity}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardCompact: {
    marginHorizontal: 2,
    marginVertical: 1,
  },
  cardHorizontal: {
    marginVertical: 2,
  },
  cardFill: {
    flex: 1,
    minHeight: 0,
  },
  bar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentFill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  labelInline: {
    flex: 1,
  },
  timeInline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    marginLeft: 4,
  },
  time: {
    marginBottom: 2,
  },
  intensity: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
});
