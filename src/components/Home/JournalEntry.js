import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  Keyboard,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store/useStore';
import { getTimeNow24h } from '../../utils/time';
import Card from '../ui/Card';
import { useTheme } from '../../store/ThemeContext';

const FADE_DURATION = 120;
const KEYBOARD_CLOSE_DELAY = 80;
const KEYBOARD_MARGIN = 12;
const PANEL_HEIGHT_RATIO = 0.72;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateToDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

export function JournalEditor({ date, initialText, onClose, entryId = null }) {
  const { palette, text, shape } = useTheme();
  const [value, setValue] = useState(initialText);
  const [selectedDate, setSelectedDate] = useState(parseDateToDate(date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const { dispatch } = useStore();
  const windowHeight = Dimensions.get('window').height;
  const topOffset = windowHeight * 0.08;
  const isEdit = entryId != null;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const performClose = () => {
    const t = value.trim();
    if (t) {
      const finalDate = formatDateKey(selectedDate);
      if (isEdit) {
        dispatch({
          type: 'UPDATE_JOURNAL_ENTRY',
          payload: { id: entryId, text: t, date: finalDate },
        });
      } else {
        dispatch({
          type: 'ADD_JOURNAL_ENTRY',
          payload: {
            id: 'j_' + Date.now(),
            date: finalDate,
            time: getTimeNow24h(),
            text: t,
          },
        });
      }
    }
    Keyboard.dismiss();
    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => onClose());
    }, KEYBOARD_CLOSE_DELAY);
  };

  const panelHeight =
    keyboardHeight > 0
      ? windowHeight - topOffset - keyboardHeight - KEYBOARD_MARGIN
      : windowHeight * PANEL_HEIGHT_RATIO;

  return (
    <Modal visible transparent animationType="none" onRequestClose={performClose}>
      <Animated.View style={[editorStyles.backdrop, { opacity, paddingTop: topOffset }]}>
        <TouchableOpacity style={editorStyles.backdropTouch} activeOpacity={1} onPress={performClose} />
        <View style={editorStyles.panelWrap}>
          <View
            style={[
              editorStyles.panel,
              {
                height: panelHeight,
                backgroundColor: palette.cardElevated,
                borderRadius: shape.cardRadius,
                borderCurve: shape.borderCurve,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={[editorStyles.header, { borderBottomColor: palette.separator }]}>
              <Text style={text.headline}>{isEdit ? 'Edit entry' : 'Add journal entry'}</Text>
              <TouchableOpacity onPress={performClose}>
                <Text style={[text.body, { color: palette.tint }]}>Save</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={editorStyles.scroll} contentContainerStyle={editorStyles.scrollContent}>
              <TouchableOpacity
                style={[editorStyles.dateButton, { backgroundColor: palette.card }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={palette.tint} style={editorStyles.dateIcon} />
                <Text style={text.body}>{formatDateDisplay(formatDateKey(selectedDate))}</Text>
              </TouchableOpacity>
              <TextInput
                style={[text.body, editorStyles.input]}
                placeholder="Start writing…"
                placeholderTextColor={palette.tertiaryLabel}
                value={value}
                onChangeText={setValue}
                multiline
                autoFocus={!isEdit}
              />
            </ScrollView>
          </View>
        </View>
      {showDatePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={editorStyles.datePickerModal}>
              <View style={[editorStyles.datePickerContainer, { backgroundColor: palette.cardElevated }]}>
                <View style={[editorStyles.datePickerHeader, { borderBottomColor: palette.separator }]}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={[text.body, { color: palette.secondaryLabel }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={text.headline}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[text.body, { color: palette.tint, fontWeight: '600' }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => {
                    if (d) setSelectedDate(d);
                  }}
                />
              </View>
            </View>
          ) : (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) setSelectedDate(d);
              }}
            />
          )}
        </>
      )}
      </Animated.View>
    </Modal>
  );
}

export default function JournalEntry() {
  const { palette, text } = useTheme();
  const today = getTodayKey();
  const [showEditor, setShowEditor] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add journal entry"
        onPress={() => setShowEditor(true)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={styles.promptCard}>
          <Text style={[text.title2, styles.promptTitle]}>
            What's on your mind?
          </Text>
          <Text style={[text.footnote, styles.promptSub]}>
            Write a few lines about today.
          </Text>
          <View style={[styles.beginButton, { backgroundColor: palette.label }]}>
            <Ionicons name="create" size={16} color={palette.background} />
            <Text style={[text.subheadline, { color: palette.background }]}>
              Begin
            </Text>
          </View>
        </Card>
      </Pressable>
      {showEditor && (
        <JournalEditor
          date={today}
          initialText=""
          onClose={() => setShowEditor(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
  },
  promptCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  promptTitle: {
    textAlign: 'center',
  },
  promptSub: {
    textAlign: 'center',
    marginTop: 4,
  },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    height: 40,
    borderRadius: 20,
    marginTop: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});

const editorStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  panelWrap: {
    width: '100%',
    alignItems: 'center',
  },
  panel: {
    width: '90%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dateIcon: {
    marginRight: 8,
  },
  input: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
