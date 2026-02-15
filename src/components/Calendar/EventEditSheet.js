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
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { EVENT_TYPE_COLORS } from '../../theme/constants';
import { extractFood, extractExercise } from '../../api/ai';

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
  const { dispatch } = useStore();
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
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
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
    setProtein(String(event.protein ?? ''));
    setCarbs(String(event.carbs ?? ''));
    setName(event.name ?? '');
    setDosage(String(event.dosage ?? ''));
    setUnit(event.unit ?? 'mg');
    setNote(event.note ?? '');
    if (event.type === EVENT_TYPES.sleep) {
      setStartTime(parseTimeToDate(event.startTime));
      setEndTime(parseTimeToDate(event.endTime));
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
        payload.time = formatTime24h(timeDate);
        payload.description = description;
        payload.calories = parseInt(calories, 10) || 0;
        payload.protein = parseInt(protein, 10) || 0;
        payload.carbs = parseInt(carbs, 10) || 0;
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
        payload.time = formatTime24h(timeDate);
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
    protein,
    carbs,
    name,
    dosage,
    unit,
    note,
    visible,
  ]);

  const handleClose = (skipSave = false) => {
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
    });
  };

  const toggleTimePicker = (key) => {
    setShowTimePicker((prev) => (prev === key ? null : key));
  };

  const handleSave = () => handleClose();

  const handleDelete = () => {
    dispatch({ type: 'DELETE_EVENT', payload: { id: event.id } });
    handleClose(true);
  };

  if (!event) return null;

  const eventColor = EVENT_TYPE_COLORS[event.type] ?? colors.accent;

  const renderFields = () => {
    switch (event.type) {
      case EVENT_TYPES.sleep:
        return (
          <>
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
          </>
        );
      case EVENT_TYPES.food:
        return (
          <>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={styles.inputText}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <Text style={styles.label}>What did you eat?</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={(t) => { setDescription(t); setAiError(null); }}
              placeholder="Oatmeal with banana"
              placeholderTextColor={colors.textTertiary}
            />
            {aiError ? (
              <Text style={styles.aiError}>{aiError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.aiButton, aiLoading && styles.aiButtonDisabled]}
              onPress={async () => {
                const t = description?.trim();
                if (!t) return;
                setAiLoading(true);
                setAiError(null);
                const result = await extractFood(t);
                setAiLoading(false);
                if (result.ok && result.data) {
                  if (result.data.description != null) setDescription(result.data.description);
                  if (result.data.calories != null) setCalories(String(result.data.calories));
                  if (result.data.protein != null) setProtein(String(result.data.protein));
                  if (result.data.carbs != null) setCarbs(String(result.data.carbs));
                } else {
                  setAiError(result.error || 'Could not get macros');
                }
              }}
              disabled={aiLoading || !description?.trim()}
            >
              <Text style={styles.aiButtonText}>
                {aiLoading ? 'Getting macros…' : 'Fill with AI'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
          </>
        );
      case EVENT_TYPES.exercise:
        return (
          <>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={styles.inputText}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <Text style={styles.label}>What did you do?</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={(t) => { setDescription(t); setAiError(null); }}
              placeholder="30 min run"
              placeholderTextColor={colors.textTertiary}
            />
            {aiError ? (
              <Text style={styles.aiError}>{aiError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.aiButton, aiLoading && styles.aiButtonDisabled]}
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
              <Text style={styles.aiButtonText}>
                {aiLoading ? 'Getting details…' : 'Fill with AI'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Duration (min)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
          </>
        );
      case EVENT_TYPES.meds:
        return (
          <>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={styles.inputText}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Vitamin D"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="1000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Unit (mg, tab, etc.)</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="mg"
              placeholderTextColor={colors.textTertiary}
            />
          </>
        );
      case EVENT_TYPES.other:
        return (
          <>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => toggleTimePicker('time')}
            >
              <Text style={styles.inputText}>{formatTime12h(formatTime24h(timeDate))}</Text>
            </TouchableOpacity>
            {showTimePicker === 'time' && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setTimeDate(d)}
              />
            )}
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Team meeting"
              placeholderTextColor={colors.textTertiary}
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
        <View style={styles.panel}>
          <View style={[styles.handle, { backgroundColor: eventColor }]} />
          <View style={styles.header}>
            <Text style={styles.title}>Edit Event</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderFields()}
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: eventColor }]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '90%',
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: typography.title3.fontSize,
    fontWeight: typography.title3.fontWeight,
    color: colors.textPrimary,
  },
  closeBtn: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  scroll: {
    maxHeight: 400,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  aiButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: typography.footnote.fontSize,
    color: colors.background,
    fontWeight: '600',
  },
  aiError: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  saveButtonText: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.background,
  },
  deleteButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: typography.body.fontSize,
    color: colors.textTertiary,
  },
});
