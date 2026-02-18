import React, { useState, useCallback, useRef } from 'react';
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
  const [animTrigger, setAnimTrigger] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryRefreshRef = useRef(null);

  const onFetchDone = useCallback(() => {
    setAnimTrigger((k) => k + 1);
  }, []);

  const onLoadingChange = useCallback((loading) => {
    setSummaryLoading(!!loading);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    summaryRefreshRef.current?.();
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

  const listHeader = (
    <>
      <View style={[styles.section, styles.sectionShaded]}>
        <AISummaryCard onRefreshRef={summaryRefreshRef} onFetchDone={onFetchDone} onLoadingChange={onLoadingChange} animTrigger={animTrigger} />
      </View>
      <View style={styles.section}>
        <MoodSelector refreshTrigger={animTrigger} loading={summaryLoading} />
      </View>
      <View style={[styles.section, styles.sectionShaded]}>
        <JournalEntry />
      </View>
      <View style={styles.section}>
        <CalorieProteinGoals animTrigger={animTrigger} loading={summaryLoading} />
      </View>
      <View style={styles.section}>
        <WaterTracker refreshTrigger={refreshKey} loading={summaryLoading} />
      </View>
      <View style={styles.section}>
        <RecentEventsList />
      </View>
    </>
  );

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
          ListHeaderComponent={listHeader}
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
