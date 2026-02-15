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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJournal } from '../store/useStore';
import { JournalEditor } from '../components/Home/JournalEntry';
import { formatTime12h } from '../utils/time';
import { colors, spacing, typography, borderRadius } from '../theme/constants';

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

const PREVIEW_LINES = 3;

export default function JournalHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const allEntries = useJournal();

  const sortedEntries = useMemo(() => {
    return [...allEntries].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return -d;
      return -a.time.localeCompare(b.time);
    });
  }, [allEntries]);

  const [expandedId, setExpandedId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
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

      {sortedEntries.length === 0 ? (
        <Text style={styles.empty}>No journal entries yet. Start writing from the home screen.</Text>
      ) : (
        sortedEntries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          return (
            <TouchableOpacity
              key={entry.id}
              style={styles.card}
              onPress={() => toggleExpand(entry.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.dateText}>{formatDateDisplay(entry.date)}</Text>
                  <Text style={styles.timeText}>{formatTime12h(entry.time)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setEditingEntry(entry);
                  }}
                >
                  <Ionicons name="pencil" size={20} color={colors.accent} />
                </TouchableOpacity>
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
        })
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
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
  editButton: {
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
});
