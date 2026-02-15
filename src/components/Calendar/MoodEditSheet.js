import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { deleteMoodEntryFromSupabase } from '../../api/supabaseSync';
import { isSupabaseConfigured } from '../../api/supabase';
import { MOOD_OPTIONS } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function getMoodColor(id) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.color ?? colors.textSecondary;
}

function parseTimeToDate(time24) {
  const [h, m] = (time24 || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function formatTime24h(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MoodEditSheet({ mood, onClose }) {
  const { dispatch } = useStore();
  const [visible, setVisible] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [emotion, setEmotion] = useState('neutral');
  const [intensity, setIntensity] = useState(3);
  const [showTimePicker, setShowTimePicker] = useState(null);

  useEffect(() => {
    setVisible(!!mood);
  }, [mood]);

  useEffect(() => {
    if (!mood) return;
    setStartTime(parseTimeToDate(mood.startTime ?? mood.time ?? '00:00'));
    setEndTime(parseTimeToDate(mood.endTime ?? '00:30'));
    setEmotion(mood.emotion ?? 'neutral');
    setIntensity(mood.intensity ?? 3);
  }, [mood?.id]);

  const toggleTimePicker = (key) => {
    setShowTimePicker((prev) => (prev === key ? null : key));
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({
      type: 'UPDATE_MOOD',
      payload: {
        ...mood,
        startTime: formatTime24h(startTime),
        endTime: formatTime24h(endTime),
        emotion,
        intensity: Math.round(intensity),
      },
    });
    onClose();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    dispatch({ type: 'DELETE_MOOD', payload: { id: mood.id } });
    if (isSupabaseConfigured()) {
      deleteMoodEntryFromSupabase(mood.id);
    }
    onClose();
  };

  if (!mood) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Edit mood</Text>

          <Text style={styles.label}>Start time</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => toggleTimePicker('start')}
          >
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
          <TouchableOpacity
            style={styles.input}
            onPress={() => toggleTimePicker('end')}
          >
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

          <Text style={styles.sectionLabel}>Mood</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {MOOD_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEmotion(m.id);
                }}
                style={[
                  styles.chip,
                  { borderColor: m.color },
                  emotion === m.id && { backgroundColor: m.color + '30', borderWidth: 2 },
                ]}
              >
                <Text style={[styles.chipLabel, { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Intensity: {Math.round(intensity)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={intensity}
            onValueChange={setIntensity}
            minimumTrackTintColor={getMoodColor(emotion)}
            maximumTrackTintColor={colors.border}
            thumbTintColor={getMoodColor(emotion)}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: typography.title3.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  inputText: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  sectionLabel: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipRow: {
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  chipLabel: {
    fontSize: typography.footnote.fontSize,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  deleteButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteText: {
    fontSize: typography.subhead.fontSize,
    color: colors.textTertiary,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  closeText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  saveText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.background,
  },
});
