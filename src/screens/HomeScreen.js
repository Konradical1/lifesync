import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl, Platform } from 'react-native';
import { ConfettiProvider } from '../components/ConfettiProvider';
import Header from '../components/Home/Header';
import AISummaryCard from '../components/Home/AISummaryCard';
import MoodSelector from '../components/Home/MoodSelector';
import JournalEntry from '../components/Home/JournalEntry';
import CalorieProteinGoals from '../components/Home/CalorieProteinGoals';
import WaterTracker from '../components/Home/WaterTracker';
import RecentEventsList from '../components/Home/RecentEventsList';
import { colors, spacing } from '../theme/constants';

const SECTION_PADDING = spacing.md;
const REFRESH_ANIMATION_MS = 1500;

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), REFRESH_ANIMATION_MS);
  }, []);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      title="Refreshing"
      titleColor={colors.textSecondary}
      colors={Platform.OS === 'android' ? [colors.accent] : undefined}
      progressViewOffset={Platform.OS === 'android' ? 0 : undefined}
      progressBackgroundColor={Platform.OS === 'android' ? colors.surface : undefined}
    />
  );

  const renderHeader = useCallback(() => (
    <>
      <View style={[styles.section, styles.sectionShaded]}>
        <AISummaryCard refreshTrigger={refreshKey} />
      </View>
      <View style={styles.section}>
        <MoodSelector refreshTrigger={refreshKey} />
      </View>
      <View style={[styles.section, styles.sectionShaded]}>
        <JournalEntry />
      </View>
      <View style={styles.section}>
        <CalorieProteinGoals />
      </View>
      <View style={styles.section}>
        <WaterTracker refreshTrigger={refreshKey} />
      </View>
      <View style={styles.section}>
        <RecentEventsList />
      </View>
    </>
  ), [refreshKey]);

  return (
    <ConfettiProvider>
      <View style={styles.wrapper}>
        <Header />
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={renderHeader}
          refreshControl={refreshControl}
          alwaysBounceVertical={true}
          bounces={true}
        />
      </View>
    </ConfettiProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
});
