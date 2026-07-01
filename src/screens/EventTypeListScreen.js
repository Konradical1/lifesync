import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventTypeRow from "../components/AddEvent/EventTypeRow";
import { EVENT_TYPES, EVENT_ICON_NAMES, EVENT_LABELS } from "../store/mockData";
import { colors, spacing, typography } from "../theme/constants";

const TYPES = [
  EVENT_TYPES.sleep,
  EVENT_TYPES.food,
  EVENT_TYPES.exercise,
  EVENT_TYPES.meds,
  EVENT_TYPES.other,
];

const JOURNAL_ENTRY = {
  id: "journal",
  iconName: "book-outline",
  label: "Journal entry",
  subtitle: "Add a journal entry",
  tintColor: colors.accent,
  onPress: (navigation) => {
    navigation.navigate("HomeTab", {
      screen: "JournalHistory",
      params: { openAddJournal: true },
    });
  },
};

export default function EventTypeListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.eyebrow}>Capture</Text>
      <Text style={styles.title}>Add Event</Text>
      <Text style={styles.subtitle}>Choose what you want to log.</Text>
      <View style={styles.list}>
        {TYPES.map((type) => (
          <EventTypeRow
            key={type}
            type={type}
            iconName={EVENT_ICON_NAMES[type]}
            label={EVENT_LABELS[type]}
            onPress={() =>
              navigation.navigate(
                type.charAt(0).toUpperCase() + type.slice(1) + "Event",
              )
            }
            style={styles.row}
          />
        ))}
        <EventTypeRow
          type="journal"
          iconName={JOURNAL_ENTRY.iconName}
          label={JOURNAL_ENTRY.label}
          subtitle={JOURNAL_ENTRY.subtitle}
          tintColor={JOURNAL_ENTRY.tintColor}
          onPress={() => JOURNAL_ENTRY.onPress(navigation)}
          style={styles.row}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 0,
    paddingBottom: 120,
  },
  eyebrow: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxs,
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  list: {
    flex: 1,
    marginTop: spacing.xs,
  },
  row: {
    flex: 1,
    marginBottom: spacing.sm,
  },
});
