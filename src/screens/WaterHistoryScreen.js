import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWaterEntries, useStore } from '../store/useStore';
import { formatTime12h } from '../utils/time';
import { colors, spacing, typography, borderRadius } from '../theme/constants';
import { isSupabaseConfigured } from '../api/supabase';
import { deleteWaterEntryFromSupabase } from '../api/supabaseSync';

const OZ_OPTIONS = [8, 12, 16, 20, 24, 32, 64];

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) return 'Today';
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
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return 'Yesterday';
  return date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function WaterHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const allEntries = useWaterEntries();
  const { dispatch } = useStore();

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

  const [editingEntry, setEditingEntry] = useState(null);
  const [editOz, setEditOz] = useState(16);

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
        <Text style={styles.title}>Water history</Text>
        <View style={{ width: 50 }} />
      </View>

      {Object.keys(groupedEntries).length === 0 ? (
        <Text style={styles.empty}>No water entries yet. Log water from the home screen.</Text>
      ) : (
        Object.keys(groupedEntries)
          .sort((a, b) => b.localeCompare(a))
          .map((date) => (
            <View key={date}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
                <Text style={styles.dateTotal}>
                  {groupedEntries[date].reduce((s, e) => s + (Number(e.oz) || 0), 0)} oz total
                </Text>
              </View>
              {groupedEntries[date].map((entry) => (
                <View key={entry.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.entryOz}>{entry.oz} oz</Text>
                      <Text style={styles.entryMeta}>
                        {formatDateDisplay(entry.date)} • {formatTime12h(entry.time)}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => openEdit(entry)}
                      >
                        <Ionicons name="pencil" size={20} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDelete(entry)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
      )}

      {editingEntry && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditingEntry(null)}
          >
            <View style={styles.editSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.editTitle}>Change amount</Text>
              <View style={styles.ozGrid}>
                {OZ_OPTIONS.map((oz) => (
                  <TouchableOpacity
                    key={oz}
                    style={[styles.ozChip, editOz === oz && styles.ozChipSelected]}
                    onPress={() => setEditOz(oz)}
                  >
                    <Text style={[styles.ozChipText, editOz === oz && styles.ozChipTextSelected]}>
                      {oz} oz
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingEntry(null)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
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
  dateTotal: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  entryOz: {
    fontSize: typography.headline.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryMeta: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl + (Platform.OS === 'ios' ? 34 : 0),
  },
  editTitle: {
    fontSize: typography.title3.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  ozGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ozChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ozChipSelected: {
    backgroundColor: colors.water + '30',
    borderColor: colors.water,
  },
  ozChipText: {
    fontSize: typography.callout.fontSize,
    color: colors.textSecondary,
  },
  ozChipTextSelected: {
    color: colors.water,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelButtonText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.water,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  saveButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.background,
  },
});
