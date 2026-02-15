import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Home/Header';
import AISummaryCard from '../components/Home/AISummaryCard';
import MoodSelector from '../components/Home/MoodSelector';
import JournalEntry from '../components/Home/JournalEntry';
import RecentEventsList from '../components/Home/RecentEventsList';
import { colors, spacing, typography } from '../theme/constants';

const SECTION_PADDING = spacing.md;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Header />
      </View>
      <View style={[styles.section, styles.sectionShaded]}>
        <Text style={styles.sectionHeader}>AI day <Text style={styles.sectionHeaderHighlight}>summary</Text></Text>
        <AISummaryCard />
      </View>
      <View style={styles.section}>
        <MoodSelector />
      </View>
      <View style={[styles.section, styles.sectionShaded]}>
        <JournalEntry />
      </View>
      <View style={styles.section}>
        <RecentEventsList />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    paddingVertical: SECTION_PADDING,
  },
  sectionShaded: {
    backgroundColor: colors.sectionShade,
  },
  sectionHeader: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.md,
  },
  sectionHeaderHighlight: {
    color: colors.accent,
    fontWeight: '600',
  },
});
