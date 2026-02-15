import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export default function OtherEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();

  const [note, setNote] = useState('');

  const handleSave = () => {
    if (!note.trim()) return;
    const date = formatDateKey(new Date());
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        type: EVENT_TYPES.other,
        date,
        time: getTimeNow24h(),
        note: note.trim(),
      },
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Other</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Note (AI will interpret later)</Text>
        <TextInput
          style={styles.input}
          placeholder="Freeform text…"
          placeholderTextColor={colors.textTertiary}
          value={note}
          onChangeText={setNote}
          multiline
        />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={!note.trim()}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.background,
  },
});
