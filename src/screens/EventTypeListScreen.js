import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventTypeRow from '../components/AddEvent/EventTypeRow';
import { EVENT_TYPES, EVENT_ICON_NAMES, EVENT_LABELS } from '../store/mockData';
import { colors, spacing, typography } from '../theme/constants';

const TYPES = [
  EVENT_TYPES.sleep,
  EVENT_TYPES.food,
  EVENT_TYPES.exercise,
  EVENT_TYPES.meds,
  EVENT_TYPES.other,
];

export default function EventTypeListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Add <Text style={styles.titleHighlight}>Event</Text></Text>
      <Text style={styles.subtitle}>Choose a category to log</Text>
      {TYPES.map((type) => (
        <EventTypeRow
          key={type}
          type={type}
          iconName={EVENT_ICON_NAMES[type]}
          label={EVENT_LABELS[type]}
          onPress={() => navigation.navigate(
          type.charAt(0).toUpperCase() + type.slice(1) + 'Event'
        )}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontWeight: typography.largeTitle.fontWeight,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  titleHighlight: {
    color: colors.accent,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
});
