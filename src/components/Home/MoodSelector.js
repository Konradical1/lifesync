import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useStore, useMood } from '../../store/useStore';
import { MOOD_OPTIONS, generateMoodId } from '../../store/mockData';
import { addMinutesToTime } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

const REVEAL_DURATION_MS = 400;
const REVEAL_STAGGER = 0.06;

function RevealWord({ text, index, progress, style, addSpace }) {
  const animatedStyle = useAnimatedStyle(() => {
    const start = index * REVEAL_STAGGER;
    const end = start + 0.25;
    const opacity = interpolate(progress.value, [start, end], [0, 1], 'clamp');
    const translateY = interpolate(progress.value, [start, end], [8, 0], 'clamp');
    return { opacity, transform: [{ translateY }] };
  });
  return (
    <Animated.Text style={[style, animatedStyle]}>
      {text}{addSpace ? ' ' : ''}
    </Animated.Text>
  );
}

function TextReveal({ words, refreshTrigger, labelStyle, valueStyle }) {
  const progress = useSharedValue(0);
  const prevTrigger = useRef(refreshTrigger);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const runReveal = () => {
      progress.value = 0;
      requestAnimationFrame(() => {
        progress.value = withTiming(1, { duration: (REVEAL_DURATION_MS / 1000) * 1.4 });
      });
    };
    if (refreshTrigger != null && refreshTrigger > 0 && refreshTrigger !== prevTrigger.current) {
      prevTrigger.current = refreshTrigger;
      runReveal();
    } else if (!hasAnimated.current) {
      hasAnimated.current = true;
      runReveal();
    } else {
      progress.value = 1;
    }
  }, [refreshTrigger, progress]);

  return (
    <View style={styles.revealRow}>
      {words.map((word, i) => (
        <RevealWord
          key={i}
          text={word.text}
          index={i}
          progress={progress}
          style={word.isValue ? valueStyle : labelStyle}
          addSpace={i < words.length - 1}
        />
      ))}
    </View>
  );
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMoodLabel(id) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.label ?? id;
}

function getMoodColor(id) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.color ?? colors.textSecondary;
}

export default function MoodSelector({ refreshTrigger }) {
  const today = formatDateKey(new Date());
  const saved = useMood(today);
  const { dispatch } = useStore();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [emotion, setEmotion] = useState(saved?.emotion ?? 'neutral');
  const [intensity, setIntensity] = useState(saved?.intensity ?? 3);

  useEffect(() => {
    setEmotion(saved?.emotion ?? 'neutral');
    setIntensity(saved?.intensity ?? 3);
  }, [saved?.emotion, saved?.intensity]);

  useEffect(() => {
    if (modalVisible) {
      setEmotion(saved?.emotion ?? 'neutral');
      setIntensity(saved?.intensity ?? 3);
    }
  }, [modalVisible, saved?.emotion, saved?.intensity]);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startTime = time;
    const endTime = addMinutesToTime(time, 30);
    dispatch({
      type: 'ADD_MOOD',
      payload: {
        id: generateMoodId(),
        date: today,
        time,
        startTime,
        endTime,
        emotion,
        intensity: Math.round(intensity),
        createdAt: now.toISOString(),
      },
    });
    setModalVisible(false);
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  const currentLabel = saved ? getMoodLabel(saved.emotion) : null;
  const moodWords = [
    { text: 'Your', isValue: false },
    { text: 'current', isValue: false },
    { text: 'mood', isValue: false },
    { text: 'is', isValue: false },
    { text: currentLabel ?? 'not set', isValue: true },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.displayRow}>
        <TextReveal
          words={moodWords}
          refreshTrigger={refreshTrigger}
          labelStyle={styles.label}
          valueStyle={[styles.moodValue, { color: saved ? getMoodColor(saved.emotion) : colors.textSecondary }]}
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.editHistoryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('CalendarTab', {
                screen: 'Calendar',
                params: { mode: 'mood', focusDate: today },
              });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.editHistoryText}>Edit history</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>How are you feeling?</Text>

            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEmotion(m.id);
                  }}
                  style={[
                    styles.moodChip,
                    { backgroundColor: m.color + '30', borderColor: m.color },
                    emotion === m.id && styles.moodChipActive,
                    emotion === m.id && { borderWidth: 2, backgroundColor: m.color + '50' },
                  ]}
                >
                  <Text
                    style={[
                      styles.moodChipLabel,
                      { color: m.color },
                      emotion === m.id && styles.moodChipLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sliderSection}>
              <Text style={styles.sliderLabel}>
                Intensity: <Text style={styles.sliderValue}>{Math.round(intensity)}</Text>
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={5}
                step={1}
                value={intensity}
                onValueChange={(v) => setIntensity(v)}
                onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                minimumTrackTintColor={getMoodColor(emotion)}
                maximumTrackTintColor={colors.border}
                thumbTintColor={getMoodColor(emotion)}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  editHistoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  editHistoryText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
  },
  revealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  moodValue: {
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: typography.title3.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  moodChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  moodChipActive: {
    borderWidth: 2,
  },
  moodChipLabel: {
    fontSize: typography.footnote.fontSize,
    fontWeight: '500',
  },
  moodChipLabelActive: {
    fontWeight: '700',
  },
  sliderSection: {
    marginBottom: spacing.lg,
  },
  sliderLabel: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sliderValue: {
    color: colors.accent,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  closeButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: '600',
    color: colors.background,
  },
});
