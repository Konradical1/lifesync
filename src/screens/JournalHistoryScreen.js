import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useJournal, useStore } from '../store/useStore';
import { JournalEditor } from '../components/Home/JournalEntry';
import { formatTime12h } from '../utils/time';
import { colors, spacing, typography, borderRadius } from '../theme/constants';
import { isSupabaseConfigured } from '../api/supabase';
import { deleteJournalEntryFromSupabase } from '../api/supabaseSync';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (isToday) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return 'Yesterday';
  return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

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

const PREVIEW_LINES = 3;

export default function JournalHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const allEntries = useJournal();
  const { dispatch } = useStore();

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTouch}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal history</Text>
        <View style={{ width: 50 }} />
      </View>

      {Object.keys(groupedEntries).length === 0 ? (
        <Text style={styles.empty}>No journal entries yet. Start writing from the home screen.</Text>
      ) : (
        Object.keys(groupedEntries)
          .sort((a, b) => b.localeCompare(a))
          .map((date) => (
            <View key={date}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
              </View>
              {groupedEntries[date].map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.card}
                    onPress={() => toggleExpand(entry.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardHeader}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          openDatePicker(entry);
                        }}
                        style={styles.dateButton}
                      >
                        <Text style={styles.dateText}>{formatDateDisplay(entry.date)}</Text>
                        <Text style={styles.timeText}>{formatTime12h(entry.time)}</Text>
                      </TouchableOpacity>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setEditingEntry(entry);
                          }}
                        >
                          <Ionicons name="pencil" size={20} color={colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(entry);
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text
                      style={styles.body}
                      numberOfLines={isExpanded ? undefined : PREVIEW_LINES}
                      ellipsizeMode={isExpanded ? undefined : 'tail'}
                    >
                      {entry.text}
                    </Text>
                    {!isExpanded && (entry.text.length > 100 || entry.text.includes('\n')) ? (
                      <Text style={styles.tapHint}>Tap to read more</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
      )}

      {showDatePicker && editingDateEntry && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDatePicker(false);
                      setEditingDateEntry(null);
                    }}
                  >
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      handleDateChange(editingDateEntry, datePickerDate);
                    }}
                  >
                    <Text style={styles.datePickerConfirm}>Done</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backTouch: {
    padding: spacing.xs,
  },
  backLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  title: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    color: colors.textPrimary,
  },
  empty: {
    fontSize: typography.body.fontSize,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateHeaderText: {
    fontSize: typography.title3.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  dateButton: {
    flex: 1,
  },
  dateText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    padding: spacing.xs,
    margin: -spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
    margin: -spacing.xs,
  },
  body: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  tapHint: {
    fontSize: typography.caption1.fontSize,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
  datePickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerCancel: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  datePickerTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
  },
  datePickerConfirm: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
    fontWeight: '600',
  },
});
