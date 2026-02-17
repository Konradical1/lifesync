import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { formatTime12h } from '../../utils/time';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime24h(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export default function OtherEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();

  const now = new Date();
  const endDefault = new Date(now.getTime() + 30 * 60 * 1000);
  const [note, setNote] = useState('');
  const [startTime, setStartTime] = useState(now);
  const [endTime, setEndTime] = useState(endDefault);
  const [showTimePicker, setShowTimePicker] = useState(null);

  const handleSave = () => {
    if (!note.trim()) return;
    const date = formatDateKey(startTime);
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        type: EVENT_TYPES.other,
        date,
        startTime: formatTime24h(startTime),
        endTime: formatTime24h(endTime),
        note: note.trim(),
      },
    });
    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.contentScroll}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Other</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Start time</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker((p) => (p === 'start' ? null : 'start'))}>
          <Text style={styles.inputText}>{formatTime12h(formatTime24h(startTime))}</Text>
        </TouchableOpacity>
        {showTimePicker === 'start' && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => d && setStartTime(d)}
          />
        )}
        <Text style={styles.label}>End time</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker((p) => (p === 'end' ? null : 'end'))}>
          <Text style={styles.inputText}>{formatTime12h(formatTime24h(endTime))}</Text>
        </TouchableOpacity>
        {showTimePicker === 'end' && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => d && setEndTime(d)}
          />
        )}
        <Text style={styles.label}>Note (AI will interpret later)</Text>
        <TextInput
          style={[styles.input, styles.textAreaInput]}
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
    </ScrollView>
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
  contentScroll: {
    paddingBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputText: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  textAreaInput: {
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
