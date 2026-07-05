import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWaterEntries, useTodayWaterOz, useStore } from '../store/useStore';
import { formatTime12h } from '../utils/time';
import Card from '../components/ui/Card';
import StatBar from '../components/Home/StatBar';
import { useTheme } from '../store/ThemeContext';
import { isSupabaseConfigured } from '../api/supabase';
import { deleteWaterEntryFromSupabase } from '../api/supabaseSync';

const OZ_OPTIONS = [8, 12, 16, 20, 24, 32, 64];
const SCREEN_MARGIN = 20;
const TAB_BAR_CLEARANCE = 140;
const REFRESH_ANIMATION_MS = 700;
const DEFAULT_WATER_GOAL_OZ = 64;
const BACK_HIT_SLOP = 8;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  if (dateStr === formatDateKey(today)) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatDateKey(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('default', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Centered letterspaced-caps section divider, matching the Home screen. */
function SectionHeader({ title }) {
  const { text } = useTheme();
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={text.eyebrow}>{title.toUpperCase()}</Text>
    </View>
  );
}

/** One water entry row inside a day card: ounces, time, edit/delete actions. */
function EntryRow({ entry, isLast, onEdit, onDelete }) {
  const { palette, text } = useTheme();
  return (
    <View
      style={[
        styles.entryRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.separator,
        },
      ]}
    >
      <View style={styles.entryInfo}>
        <Text style={text.subheadline}>{entry.oz} oz</Text>
        <Text style={[text.footnote, styles.entryTime]}>
          {formatTime12h(entry.time)}
        </Text>
      </View>
      <View style={styles.entryActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${entry.oz} ounce entry`}
          hitSlop={BACK_HIT_SLOP}
          onPress={onEdit}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="pencil" size={18} color={palette.tint} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${entry.oz} ounce entry`}
          hitSlop={BACK_HIT_SLOP}
          onPress={onDelete}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={18} color={palette.red} />
        </Pressable>
      </View>
    </View>
  );
}

export default function WaterHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { palette, text, shape } = useTheme();
  const allEntries = useWaterEntries();
  const todayOz = useTodayWaterOz();
  const { state, dispatch } = useStore();

  const waterGoal =
    parseInt(state.profile?.waterGoalOz, 10) || DEFAULT_WATER_GOAL_OZ;
  const progress = waterGoal > 0 ? Math.min(1, todayOz / waterGoal) : 0;
  const percent = Math.round(progress * 100);

  const [refreshing, setRefreshing] = useState(false);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editOz, setEditOz] = useState(16);

  const groupedEntries = useMemo(() => {
    const sorted = [...allEntries].sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      if (d !== 0) return -d;
      return -(a.time || '').localeCompare(b.time || '');
    });
    const grouped = {};
    sorted.forEach((entry) => {
      const date = entry.date || 'unknown';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(entry);
    });
    return grouped;
  }, [allEntries]);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) =>
    b.localeCompare(a),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setAnimTrigger((k) => k + 1);
    }, REFRESH_ANIMATION_MS);
  }, []);

  const handleDelete = (entry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this water entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_WATER_ENTRY', payload: { id: entry.id } });
          if (isSupabaseConfigured()) {
            deleteWaterEntryFromSupabase(entry.id).catch(() => {});
          }
        },
      },
    ]);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setEditOz(Number(entry.oz) || 16);
  };

  const saveEdit = () => {
    if (!editingEntry) return;
    dispatch({
      type: 'UPDATE_WATER_ENTRY',
      payload: { id: editingEntry.id, oz: editOz },
    });
    setEditingEntry(null);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={palette.label}
      // Content starts below the notch, so push the spinner down the same
      // amount or it hides behind the status bar.
      progressViewOffset={insets.top + 12}
      colors={Platform.OS === 'android' ? [palette.tint] : undefined}
      progressBackgroundColor={Platform.OS === 'android' ? palette.card : undefined}
    />
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={BACK_HIT_SLOP}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={palette.label} />
          </Pressable>
          <Text style={text.display} accessibilityRole="header">
            water.
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <Text style={text.eyebrow}>TODAY</Text>
          <Text style={[text.caption, styles.percentLine, { color: palette.cyan }]}>
            {`${percent}% OF GOAL`}
          </Text>
          <View style={styles.valueRow}>
            <Text style={text.statValue}>{todayOz}</Text>
            <Text style={[text.footnote, styles.unit]}>oz</Text>
          </View>
          <Text style={text.footnote}>{`of ${waterGoal} oz`}</Text>
          <View style={styles.barWrap}>
            <StatBar
              progress={progress}
              color={palette.cyan}
              animTrigger={animTrigger}
            />
          </View>
        </Card>

        <SectionHeader title="History" />

        {sortedDates.length === 0 ? (
          <Card style={styles.card}>
            <Text style={[text.footnote, styles.emptyText]}>
              No water entries yet. Log water from the home screen.
            </Text>
          </Card>
        ) : (
          sortedDates.map((date) => {
            const dayEntries = groupedEntries[date];
            const dayTotal = dayEntries.reduce(
              (sum, e) => sum + (Number(e.oz) || 0),
              0,
            );
            return (
              <Card key={date} style={[styles.card, styles.dayCard]}>
                <View
                  style={[
                    styles.dayHeader,
                    {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: palette.separator,
                    },
                  ]}
                >
                  <Text style={text.headline}>{formatDateHeader(date)}</Text>
                  <Text style={text.footnote}>{`${dayTotal} oz`}</Text>
                </View>
                {dayEntries.map((entry, index) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isLast={index === dayEntries.length - 1}
                    onEdit={() => openEdit(entry)}
                    onDelete={() => handleDelete(entry)}
                  />
                ))}
              </Card>
            );
          })
        )}
      </ScrollView>

      {editingEntry && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setEditingEntry(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditingEntry(null)}
          >
            <Pressable
              style={[
                styles.editSheet,
                {
                  backgroundColor: palette.card,
                  borderTopLeftRadius: shape.cardRadius,
                  borderTopRightRadius: shape.cardRadius,
                  borderCurve: shape.borderCurve,
                  paddingBottom: insets.bottom + 20,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[text.title3, styles.editTitle]}>Change amount</Text>
              <View style={styles.ozGrid}>
                {OZ_OPTIONS.map((oz) => {
                  const isSelected = editOz === oz;
                  return (
                    <Pressable
                      key={oz}
                      accessibilityRole="button"
                      accessibilityLabel={`${oz} ounces`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setEditOz(oz)}
                      style={({ pressed }) => [
                        styles.ozChip,
                        {
                          backgroundColor: isSelected ? palette.cyan : palette.fill,
                          borderRadius: shape.controlRadius,
                          borderCurve: shape.borderCurve,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          text.subheadline,
                          { color: isSelected ? '#FFFFFF' : palette.label },
                        ]}
                      >
                        {oz} oz
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.editActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={() => setEditingEntry(null)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                >
                  <Text style={[text.subheadline, { color: palette.secondaryLabel }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save"
                  onPress={saveEdit}
                  style={({ pressed }) => [
                    styles.saveButton,
                    {
                      backgroundColor: palette.cyan,
                      borderRadius: shape.controlRadius,
                      borderCurve: shape.borderCurve,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[text.subheadline, { color: '#FFFFFF' }]}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SCREEN_MARGIN,
    marginBottom: 16,
  },
  backButton: {
    width: 26,
    alignItems: 'flex-start',
    marginLeft: -6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: SCREEN_MARGIN,
    marginTop: 30,
    marginBottom: 12,
  },
  summaryCard: {
    marginHorizontal: SCREEN_MARGIN,
  },
  percentLine: {
    marginTop: 10,
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  unit: {
    marginBottom: 1,
  },
  barWrap: {
    marginTop: 10,
  },
  card: {
    marginHorizontal: SCREEN_MARGIN,
  },
  dayCard: {
    marginBottom: 12,
    paddingVertical: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  entryInfo: {
    flex: 1,
    minWidth: 0,
  },
  entryTime: {
    marginTop: 1,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    paddingHorizontal: SCREEN_MARGIN,
    paddingTop: 20,
  },
  editTitle: {
    marginBottom: 16,
  },
  ozGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  ozChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
