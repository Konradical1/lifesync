import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { getTimeNow24h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

const FADE_DURATION = 120;
const KEYBOARD_CLOSE_DELAY = 80;
const KEYBOARD_MARGIN = 12;
const PANEL_HEIGHT_RATIO = 0.72;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function JournalEditor({ date, initialText, onClose, entryId = null }) {
  const [value, setValue] = useState(initialText);
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
      if (isEdit) {
        dispatch({
          type: 'UPDATE_JOURNAL_ENTRY',
          payload: { id: entryId, text: t },
        });
      } else {
        dispatch({
          type: 'ADD_JOURNAL_ENTRY',
          payload: {
            id: 'j_' + Date.now(),
            date,
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
          <View style={[editorStyles.panel, { height: panelHeight }]} pointerEvents="box-none">
            <View style={editorStyles.header}>
              <Text style={editorStyles.title}>{isEdit ? 'Edit entry' : 'Add journal entry'}</Text>
              <TouchableOpacity onPress={performClose}>
                <Text style={editorStyles.close}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={editorStyles.input}
              placeholder="Start writing…"
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={setValue}
              multiline
              autoFocus={!isEdit}
            />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

export default function JournalEntry() {
  const today = getTodayKey();
  const [showEditor, setShowEditor] = useState(false);
  const navigation = useNavigation();

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.labelWithIcon}>
          <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} style={styles.pencilIcon} />
          <Text style={styles.label}>Journal</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('JournalHistory')}
          style={styles.historyButton}
        >
          <Text style={styles.historyButtonText}>Journal history</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.card}
        onPress={() => setShowEditor(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.placeholder}>Start writing…</Text>
      </TouchableOpacity>
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
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pencilIcon: {
    marginRight: spacing.xxs,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  historyButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  historyButtonText: {
    fontSize: typography.footnote.fontSize,
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 80,
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: typography.body.fontSize,
    color: colors.textTertiary,
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
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '90%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
  },
  close: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
