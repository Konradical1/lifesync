import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

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

export default function SleepEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();

  const getStart = () => {
    const d = new Date();
    d.setHours(23, 0, 0, 0);
    return d;
  };
  const getEnd = () => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  };

  const [startTime, setStartTime] = useState(() => getStart());
  const [endTime, setEndTime] = useState(() => getEnd());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const handleSave = () => {
    const date = formatDateKey(new Date());
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        type: EVENT_TYPES.sleep,
        date,
        startTime: formatTime24h(startTime),
        endTime: formatTime24h(endTime),
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
        <Text style={styles.title}>Log Sleep</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Start time</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowStart(true)}
        >
          <Text style={styles.timeText}>{formatTime12h(formatTime24h(startTime))}</Text>
        </TouchableOpacity>
        {showStart && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (d) setStartTime(d);
              if (Platform.OS === 'android') setShowStart(false);
            }}
          />
        )}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>End time</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowEnd(true)}
        >
          <Text style={styles.timeText}>{formatTime12h(formatTime24h(endTime))}</Text>
        </TouchableOpacity>
        {showEnd && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (d) setEndTime(d);
              if (Platform.OS === 'android') setShowEnd(false);
            }}
          />
        )}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
  timeButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  timeText: {
    fontSize: typography.title2.fontSize,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonText: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.background,
  },
});
