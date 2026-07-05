import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventTypeRow from "../components/AddEvent/EventTypeRow";
import { EVENT_TYPES, EVENT_ICON_NAMES, EVENT_LABELS } from "../store/mockData";
import { useTheme } from "../store/ThemeContext";

const SCREEN_MARGIN = 20;
const TAB_BAR_CLEARANCE = 140;

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
  const { palette, text } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + 12 },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={text.eyebrow}>{"Capture".toUpperCase()}</Text>
        <Text style={[text.display, styles.title]}>log something.</Text>
        <Text style={[text.footnote, styles.subtitle]}>
          Choose what you want to log.
        </Text>
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
            tintColor={palette.tint}
            onPress={() => JOURNAL_ENTRY.onPress(navigation)}
            style={styles.row}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_MARGIN,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  title: {
    marginTop: 6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  row: {
    marginBottom: 0,
  },
});
