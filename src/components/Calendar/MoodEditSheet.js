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
import { useTheme } from '../../store/ThemeContext';

function getMoodColor(id, fallback) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.color ?? fallback;
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
  const { palette, text, shape } = useTheme();
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

  const inputSurface = {
    backgroundColor: palette.fill,
    borderRadius: shape.controlRadius,
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: palette.cardElevated,
              borderCurve: shape.borderCurve,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[text.title3, styles.title]}>Edit mood</Text>

          <Text style={[text.footnote, styles.label]}>Start time</Text>
          <TouchableOpacity
            style={[styles.input, inputSurface]}
            onPress={() => toggleTimePicker('start')}
          >
            <Text style={text.body}>{formatTime12h(formatTime24h(startTime))}</Text>
          </TouchableOpacity>
          {showTimePicker === 'start' && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => d && setStartTime(d)}
            />
          )}

          <Text style={[text.footnote, styles.label]}>End time</Text>
          <TouchableOpacity
            style={[styles.input, inputSurface]}
            onPress={() => toggleTimePicker('end')}
          >
            <Text style={text.body}>{formatTime12h(formatTime24h(endTime))}</Text>
          </TouchableOpacity>
          {showTimePicker === 'end' && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => d && setEndTime(d)}
            />
          )}

          <Text style={[text.footnote, styles.label]}>Mood</Text>
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
                  {
                    backgroundColor:
                      emotion === m.id ? m.color + '30' : palette.fill,
                  },
                ]}
              >
                <Text style={[text.caption, { color: m.color }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[text.footnote, styles.label]}>
            Intensity: {Math.round(intensity)}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={intensity}
            onValueChange={setIntensity}
            minimumTrackTintColor={getMoodColor(emotion, palette.tint)}
            maximumTrackTintColor={palette.fill}
            thumbTintColor={getMoodColor(emotion, palette.tint)}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={[text.subheadline, { color: palette.red }]}>
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.fill }]}
              onPress={onClose}
            >
              <Text style={[text.subheadline, { color: palette.label }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: palette.label }]}
              onPress={handleSave}
            >
              <Text style={[text.subheadline, { color: palette.background }]}>
                Save
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    padding: 16,
  },
  chipRow: {
    marginBottom: 24,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
});
