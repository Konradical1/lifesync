import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useJournal, useStore } from '../store/useStore';
import { JournalEditor } from '../components/Home/JournalEntry';
import { formatTime12h } from '../utils/time';
import Card from '../components/ui/Card';
import { useTheme } from '../store/ThemeContext';
import { fonts } from '../theme/ios';
import { isSupabaseConfigured } from '../api/supabase';
import { deleteJournalEntryFromSupabase } from '../api/supabaseSync';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_MARGIN = 20;
const TAB_BAR_CLEARANCE = 140;
const REFRESH_ANIMATION_MS = 700;
const PREVIEW_LINES = 3;
const LONG_ENTRY_CHAR_COUNT = 100;
const BACK_HIT_SLOP = 8;

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (isToday) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return 'Yesterday';
  return date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function parseDateToDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/** One journal entry row inside a date card: time, actions, expandable body. */
function EntryRow({ entry, isLast, isExpanded, onToggle, onEdit, onDelete, onPickDate }) {
  const { palette, text } = useTheme();
  const showHint =
    !isExpanded && (entry.text.length > LONG_ENTRY_CHAR_COUNT || entry.text.includes('\n'));

  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.separator,
        },
      ]}
    >
      <View style={styles.rowHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change date, entry at ${formatTime12h(entry.time)}`}
          hitSlop={BACK_HIT_SLOP}
          onPress={onPickDate}
          style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
        >
          <Text style={text.caption}>{formatTime12h(entry.time)}</Text>
        </Pressable>
        <View style={styles.actionButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit entry"
            hitSlop={BACK_HIT_SLOP}
            onPress={onEdit}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="pencil" size={18} color={palette.tint} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
            hitSlop={BACK_HIT_SLOP}
            onPress={onDelete}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={palette.red} />
          </Pressable>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Collapse entry' : 'Expand entry'}
        onPress={onToggle}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text
          style={text.body}
          numberOfLines={isExpanded ? undefined : PREVIEW_LINES}
          ellipsizeMode={isExpanded ? undefined : 'tail'}
        >
          {entry.text}
        </Text>
        {showHint ? (
          <Text style={[text.footnote, styles.tapHint, { color: palette.tertiaryLabel }]}>
            Tap to read more
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

export default function JournalHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const allEntries = useJournal();
  const { dispatch } = useStore();
  const { palette, text, shape } = useTheme();

  const [showAddJournal, setShowAddJournal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route.params?.openAddJournal) {
      setShowAddJournal(true);
      navigation.setParams({ openAddJournal: undefined });
    }
  }, [route.params?.openAddJournal]);

  const groupedEntries = useMemo(() => {
    const sorted = [...allEntries].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return -d;
      return -a.time.localeCompare(b.time);
    });
    const grouped = {};
    sorted.forEach((entry) => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      grouped[entry.date].push(entry);
    });
    return grouped;
  }, [allEntries]);

  const [expandedId, setExpandedId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingDateEntry, setEditingDateEntry] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, REFRESH_ANIMATION_MS);
  }, []);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = (entry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_JOURNAL_ENTRY', payload: { id: entry.id } });
          if (isSupabaseConfigured()) {
            deleteJournalEntryFromSupabase(entry.id).catch(() => {});
          }
        },
      },
    ]);
  };

  const handleDateChange = (entry, newDate) => {
    const newDateStr = formatDateKey(newDate);
    dispatch({
      type: 'UPDATE_JOURNAL_ENTRY',
      payload: { id: entry.id, date: newDateStr },
    });
    setEditingDateEntry(null);
    setShowDatePicker(false);
  };

  const openDatePicker = (entry) => {
    setEditingDateEntry(entry);
    setDatePickerDate(parseDateToDate(entry.date));
    setShowDatePicker(true);
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

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

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
          <Text style={text.title2} accessibilityRole="header">
            journal history.
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {sortedDates.length === 0 ? (
          <Card style={styles.card}>
            <Text style={[text.footnote, styles.emptyText]}>
              No journal entries yet. Start writing from the home screen.
            </Text>
          </Card>
        ) : (
          sortedDates.map((date) => (
            <View key={date}>
              <SectionHeader title={formatDateHeader(date)} />
              <Card style={styles.card}>
                {groupedEntries[date].map((entry, index) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isLast={index === groupedEntries[date].length - 1}
                    isExpanded={expandedId === entry.id}
                    onToggle={() => toggleExpand(entry.id)}
                    onEdit={() => setEditingEntry(entry)}
                    onDelete={() => handleDelete(entry)}
                    onPickDate={() => openDatePicker(entry)}
                  />
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>

      {showDatePicker && editingDateEntry && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={styles.datePickerModal}>
              <View
                style={[
                  styles.datePickerContainer,
                  {
                    backgroundColor: palette.card,
                    borderTopLeftRadius: shape.cardRadius,
                    borderTopRightRadius: shape.cardRadius,
                    borderCurve: shape.borderCurve,
                    paddingBottom: insets.bottom + 16,
                  },
                ]}
              >
                <View
                  style={[styles.datePickerHeader, { borderBottomColor: palette.separator }]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setShowDatePicker(false);
                      setEditingDateEntry(null);
                    }}
                  >
                    <Text style={[text.body, { color: palette.secondaryLabel }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={text.headline}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      handleDateChange(editingDateEntry, datePickerDate);
                    }}
                  >
                    <Text style={[text.body, { fontFamily: fonts.bodyMedium, color: palette.tint }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={datePickerDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setDatePickerDate(selectedDate);
                    }
                  }}
                />
              </View>
            </View>
          ) : (
            <DateTimePicker
              value={datePickerDate}
              mode="date"
              display="default"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  handleDateChange(editingDateEntry, selectedDate);
                }
                setEditingDateEntry(null);
              }}
            />
          )}
        </>
      )}

      {editingEntry && (
        <JournalEditor
          date={editingEntry.date}
          initialText={editingEntry.text}
          entryId={editingEntry.id}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {showAddJournal && (
        <JournalEditor
          date={formatDateKey(new Date())}
          initialText=""
          onClose={() => setShowAddJournal(false)}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_MARGIN,
    marginBottom: 4,
  },
  backButton: {
    width: 26,
    alignItems: 'flex-start',
    marginLeft: -6,
  },
  headerSpacer: {
    width: 20,
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
  card: {
    marginHorizontal: SCREEN_MARGIN,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    paddingVertical: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeButton: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 2,
  },
  tapHint: {
    marginTop: 4,
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {},
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
});
