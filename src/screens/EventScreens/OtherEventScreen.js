import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';

const CTA_HEIGHT = 48;
const CONTROL_RADIUS = 14;
const NOTE_MIN_HEIGHT = 120;

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
  const { palette, text } = useTheme();
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

  const saveDisabled = !note.trim();
  const timeButtonStyle = [styles.timeButton, { backgroundColor: palette.fill }];

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + 12 },
      ]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="chevron-back" size={26} color={palette.label} />
        </Pressable>
        <Text style={text.title2}>log a note.</Text>
      </View>
      <View style={styles.content}>
        <Text style={[text.eyebrow, styles.label]}>
          {'Start time'.toUpperCase()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={timeButtonStyle}
          onPress={() => setShowTimePicker((p) => (p === 'start' ? null : 'start'))}
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
        <Text style={[text.eyebrow, styles.label]}>
          {'End time'.toUpperCase()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={timeButtonStyle}
          onPress={() => setShowTimePicker((p) => (p === 'end' ? null : 'end'))}
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
        <Text style={[text.eyebrow, styles.label]}>
          {'Note (AI will interpret later)'.toUpperCase()}
        </Text>
        <TextInput
          style={[
            text.body,
            styles.input,
            styles.textArea,
            { backgroundColor: palette.fill },
          ]}
          placeholder="Freeform text…"
          placeholderTextColor={palette.tertiaryLabel}
          value={note}
          onChangeText={setNote}
          multiline
        />
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.saveButton,
            { backgroundColor: palette.label },
            saveDisabled && styles.disabled,
          ]}
          onPress={handleSave}
          disabled={saveDisabled}
        >
          <Text style={[text.headline, { color: palette.background }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    marginBottom: 8,
  },
  timeButton: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  input: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  textArea: {
    minHeight: NOTE_MIN_HEIGHT,
    textAlignVertical: 'top',
  },
  saveButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
