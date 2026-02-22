import React, { useState, useCallback } from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
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
const SECTION_PADDING_TIGHT = spacing.xs;
const SECTION_GAP_FOOD_WATER = spacing.xxs;
const REFRESH_ANIMATION_MS = 700;

export default function HomeScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const onFetchDone = useCallback(() => {
    setAnimTrigger((k) => k + 1);
  }, []);

  const onLoadingChange = useCallback((loading) => {
    setSummaryLoading(!!loading);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setAnimTrigger((k) => k + 1);
    }, REFRESH_ANIMATION_MS);
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
      <View style={[styles.section, styles.sectionShaded, styles.sectionSummary]}>
        <View style={styles.summaryGlowWrap} pointerEvents="none" collapsable={false}>
          <Svg width="100%" height="100%" style={styles.summaryGlowSvg} preserveAspectRatio="none" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="summarySectionGlow" cx="0" cy="1" r="0.85" fx="0" fy="1">
                <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.09" />
                <Stop offset="50%" stopColor={colors.accent} stopOpacity="0.03" />
                <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={100} height={100} fill="url(#summarySectionGlow)" />
          </Svg>
        </View>
        <AISummaryCard refreshing={refreshing} onFetchDone={onFetchDone} onLoadingChange={onLoadingChange} animTrigger={animTrigger} />
      </View>
      <View style={styles.section}>
        <MoodSelector refreshTrigger={animTrigger} loading={summaryLoading} />
      </View>
      <View style={styles.divider} />
      <TouchableOpacity
        style={[styles.section, styles.sectionTightBottom]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AddEventTab', { screen: 'FoodEvent' })}
      >
        <CalorieProteinGoals animTrigger={animTrigger} loading={summaryLoading} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.section, styles.sectionTightTop]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('WaterHistory')}
      >
        <WaterTracker refreshTrigger={refreshKey} loading={summaryLoading} />
      </TouchableOpacity>
      <View style={[styles.section, styles.sectionShaded]}>
        <JournalEntry />
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
  sectionSummary: {
    position: 'relative',
  },
  summaryGlowWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  summaryGlowSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: -10,
    marginBottom: spacing.sm,
  },
  sectionTightBottom: {
    paddingBottom: SECTION_GAP_FOOD_WATER,
  },
  sectionTightTop: {
    paddingTop: SECTION_GAP_FOOD_WATER,
  },
});
