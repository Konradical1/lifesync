import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';

const FADE_DURATION = 120;
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import { useTheme } from '../../store/ThemeContext';
import { extractExercise } from '../../api/ai';
import { isSupabaseConfigured } from '../../api/supabase';
import { deleteEventFromSupabase } from '../../api/supabaseSync';

function parseTimeToDate(time24) {
  const [h, m] = (time24 || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function formatTime24h(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function EventEditSheet({ event, onClose }) {
  const navigation = useNavigation();
  const { dispatch } = useStore();
  const { palette, text, shape } = useTheme();
  const inputSurface = {
    backgroundColor: palette.fill,
    borderRadius: shape.controlRadius,
  };
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  // Form state per type
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [timeDate, setTimeDate] = useState(() => parseTimeToDate('00:00'));
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    setVisible(!!event);
  }, [event]);

  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    if (!event) return;
    skipNextSaveRef.current = true;
    setTimeDate(parseTimeToDate(event.time ?? event.startTime ?? '00:00'));
    setDescription(event.description ?? '');
    setDuration(String(event.duration ?? ''));
    setCalories(String(event.calories ?? ''));
    setName(event.name ?? '');
    setDosage(String(event.dosage ?? ''));
    setUnit(event.unit ?? 'mg');
    setNote(event.note ?? '');
    if (event.type === EVENT_TYPES.sleep) {
      setStartTime(parseTimeToDate(event.startTime));
      setEndTime(parseTimeToDate(event.endTime));
    }
    if (event.type === EVENT_TYPES.other) {
      const start = event.startTime ?? event.time ?? '00:00';
      let end = event.endTime;
      if (!end) {
        const [h, m] = start.split(':').map(Number);
        const endM = (h * 60 + m + 30) % (24 * 60);
        end = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
      }
      setStartTime(parseTimeToDate(start));
      setEndTime(parseTimeToDate(end));
    }
  }, [event?.id, event]);

  const saveEvent = () => {
    const payload = { ...event };
    switch (event.type) {
      case EVENT_TYPES.sleep:
        payload.startTime = formatTime24h(startTime);
        payload.endTime = formatTime24h(endTime);
        break;
      case EVENT_TYPES.food:
        // Only the time is edited here; the rest (nutrition included) rides along in the spread.
        payload.time = formatTime24h(timeDate);
        break;
      case EVENT_TYPES.exercise:
        payload.time = formatTime24h(timeDate);
        payload.description = description;
        payload.duration = parseInt(duration, 10) || 0;
        payload.calories = parseInt(calories, 10) || 0;
        break;
      case EVENT_TYPES.meds:
        payload.time = formatTime24h(timeDate);
        payload.name = name;
        payload.dosage = parseInt(dosage, 10) || 0;
        payload.unit = unit || 'mg';
        break;
      case EVENT_TYPES.other:
        payload.startTime = formatTime24h(startTime);
        payload.endTime = formatTime24h(endTime);
        payload.note = note;
        break;
      default:
        break;
    }
    dispatch({ type: 'UPDATE_EVENT', payload });
  };

  useEffect(() => {
    if (!event || !visible) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveEvent();
  }, [
    event?.id,
    startTime,
    endTime,
    timeDate,
    description,
    duration,
    calories,
    name,
    dosage,
    unit,
    note,
    visible,
  ]);

  // `then` runs once the sheet is gone, so a screen push never animates under the modal.
  const handleClose = (skipSave = false, then) => {
    Keyboard.dismiss();
    setShowTimePicker(null);
    if (!skipSave) saveEvent();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onClose?.();
      then?.();
    });
  };

  const toggleTimePicker = (key) => {
    setShowTimePicker((prev) => (prev === key ? null : key));
  };

  const handleSave = () => handleClose();

  const handleDelete = () => {
    dispatch({ type: 'DELETE_EVENT', payload: { id: event.id } });
    if (isSupabaseConfigured()) {
      deleteEventFromSupabase(event.id).catch(() => {});
    }
    handleClose(true);
  };

  if (!event) return null;

  const eventColor = EVENT_TYPE_COLORS[event.type] ?? palette.tint;

  const renderFields = () => {
    switch (event.type) {
      case EVENT_TYPES.sleep:
        return (
          <>
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
          </>
        );
      case EVENT_TYPES.food:
        return (
          <>
            <Text style={text.headline} numberOfLines={2}>{event.description || 'Meal'}</Text>
            <Text style={[text.footnote, styles.mealMacros]}>
              {`${event.calories || 0} kcal · ${event.protein || 0}p · ${event.carbs || 0}c · ${event.fat || 0}f`}
            </Text>
            <Text style={[text.footnote, styles.label]}>Time</Text>
            <TouchableOpacity
              style={[styles.input, inputSurface]}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={text.body}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <TouchableOpacity
              style={[styles.aiButton, { backgroundColor: palette.fill }]}
              onPress={() =>
                handleClose(false, () => navigation.navigate('FoodEvent', { eventId: event.id }))
              }
            >
              <Text style={[text.subheadline, { color: palette.tint }]}>Meal details</Text>
            </TouchableOpacity>
          </>
        );
      case EVENT_TYPES.exercise:
        return (
          <>
            <Text style={[text.footnote, styles.label]}>Time</Text>
            <TouchableOpacity
              style={[styles.input, inputSurface]}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={text.body}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <Text style={[text.footnote, styles.label]}>What did you do?</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface]}
              value={description}
              onChangeText={(t) => { setDescription(t); setAiError(null); }}
              placeholder="30 min run"
              placeholderTextColor={palette.tertiaryLabel}
            />
            {aiError ? (
              <Text style={[text.footnote, styles.aiError, { color: palette.red }]}>{aiError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.aiButton,
                { backgroundColor: palette.fill },
                aiLoading && styles.aiButtonDisabled,
              ]}
              onPress={async () => {
                const t = description?.trim();
                if (!t) return;
                setAiLoading(true);
                setAiError(null);
                const result = await extractExercise(t);
                setAiLoading(false);
                if (result.ok && result.data) {
                  if (result.data.description != null) setDescription(result.data.description);
                  if (result.data.duration != null) setDuration(String(result.data.duration));
                  if (result.data.calories != null) setCalories(String(result.data.calories));
                } else {
                  setAiError(result.error || 'Could not get exercise details');
                }
              }}
              disabled={aiLoading || !description?.trim()}
            >
              <Text style={[text.subheadline, { color: palette.tint }]}>
                {aiLoading ? 'Getting details…' : 'Fill with AI'}
              </Text>
            </TouchableOpacity>
            <Text style={[text.footnote, styles.label]}>Duration (min)</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface]}
              value={duration}
              onChangeText={setDuration}
              placeholder="30"
              placeholderTextColor={palette.tertiaryLabel}
              keyboardType="number-pad"
            />
            <Text style={[text.footnote, styles.label]}>Calories</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface]}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={palette.tertiaryLabel}
              keyboardType="number-pad"
            />
          </>
        );
      case EVENT_TYPES.meds:
        return (
          <>
            <Text style={[text.footnote, styles.label]}>Time</Text>
            <TouchableOpacity
              style={[styles.input, inputSurface]}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={text.body}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <Text style={[text.footnote, styles.label]}>Name</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface]}
              value={name}
              onChangeText={setName}
              placeholder="Vitamin D"
              placeholderTextColor={palette.tertiaryLabel}
            />
            <Text style={[text.footnote, styles.label]}>Dosage</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface]}
              value={dosage}
              onChangeText={setDosage}
              placeholder="1000"
              placeholderTextColor={palette.tertiaryLabel}
              keyboardType="number-pad"
            />
            <Text style={[text.footnote, styles.label]}>Unit (mg, tab, etc.)</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface]}
              value={unit}
              onChangeText={setUnit}
              placeholder="mg"
              placeholderTextColor={palette.tertiaryLabel}
            />
          </>
        );
      case EVENT_TYPES.other:
        return (
          <>
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
            <Text style={[text.footnote, styles.label]}>Note</Text>
            <TextInput
              style={[text.body, styles.input, inputSurface, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Team meeting"
              placeholderTextColor={palette.tertiaryLabel}
              multiline
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.backdropWrapper, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: palette.cardElevated,
              borderCurve: shape.borderCurve,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: eventColor }]} />
          <View style={styles.header}>
            <Text style={text.title3}>Edit Event</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={[text.subheadline, { color: palette.tint }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderFields()}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: palette.label }]}
              onPress={handleSave}
            >
              <Text style={[text.headline, { color: palette.background }]}>
                Save
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={[text.subheadline, { color: palette.red }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrapper: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  panel: {
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scroll: {
    maxHeight: 400,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
  },
  mealMacros: {
    marginTop: 4,
  },
  input: {
    padding: 16,
  },
  aiButton: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiError: {
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
  },
});
