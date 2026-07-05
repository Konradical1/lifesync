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
import { useTheme } from '../../store/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HealthNotesCard({ medicalConditions, onEdit }) {
  const { palette, text, shape } = useTheme();
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
        style={[
          styles.card,
          { backgroundColor: palette.card, borderCurve: shape.borderCurve },
        ]}
        activeOpacity={0.7}
        onPress={hasNotes ? toggleExpand : onEdit}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="medical-outline"
              size={18}
              color={palette.secondaryLabel}
            />
            <Text style={[text.subheadline, { color: palette.secondaryLabel }]}>
              Health Notes
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={18} color={palette.tint} />
            </TouchableOpacity>
            {hasNotes && (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={palette.tertiaryLabel}
                />
              </Animated.View>
            )}
          </View>
        </View>

        {hasNotes && !expanded && (
          <Text style={[text.footnote, styles.summary]} numberOfLines={2}>
            {summary}
          </Text>
        )}

        {hasNotes && expanded && (
          <Text style={[text.body, styles.fullText]}>
            {medicalConditions.trim()}
          </Text>
        )}

        {!hasNotes && (
          <Text
            style={[
              text.footnote,
              styles.summary,
              { color: palette.tertiaryLabel },
            ]}
          >
            Tap to add medical conditions, allergies, or medications
          </Text>
        )}
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summary: {
    marginTop: 8,
  },
  fullText: {
    marginTop: 12,
  },
});
