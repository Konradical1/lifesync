import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useStore, useMood } from '../../store/useStore';
import { MOOD_OPTIONS, generateMoodId } from '../../store/mockData';
import { addMinutesToTime } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';
import { SkeletonBar } from './SkeletonText';

const MOOD_BLUR_OFFSET = 10;
const MOOD_BLUR_DURATION = 380;
const MOOD_BLUR_STAGGER_MS = 42;

/** Blur-in-by-word animation for the mood value only (same as AI summary). Runs on refresh. */
function MoodValueReveal({ moodText, refreshTrigger, valueStyle }) {
  const words = (moodText || 'not set').split(/\s+/).filter(Boolean);
  const [animValues, setAnimValues] = useState([]);
  const prevTriggerRef = useRef(refreshTrigger);
  const prevMoodTextRef = useRef(moodText);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const isRefresh = refreshTrigger != null && refreshTrigger > 0 && refreshTrigger !== prevTriggerRef.current;
    const moodChanged = moodText !== prevMoodTextRef.current;
    if (refreshTrigger != null && refreshTrigger > 0) prevTriggerRef.current = refreshTrigger;
    if (moodChanged) prevMoodTextRef.current = moodText;
    const shouldRun = isRefresh || moodChanged || !hasAnimatedRef.current;
    if (!shouldRun) return;

    hasAnimatedRef.current = true;
    const values = words.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(MOOD_BLUR_OFFSET),
    }));
    setAnimValues(values);

    const run = () => {
      values.forEach((v, i) => {
        Animated.sequence([
          Animated.delay(i * MOOD_BLUR_STAGGER_MS),
          Animated.parallel([
            Animated.timing(v.opacity, {
              toValue: 1,
              duration: MOOD_BLUR_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(v.translateY, {
              toValue: 0,
              duration: MOOD_BLUR_DURATION,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    };
    requestAnimationFrame(run);
  }, [refreshTrigger, moodText]);

  if (animValues.length !== words.length) {
    return <Text style={valueStyle}>{moodText || 'not set'}</Text>;
  }

  return (
    <View style={styles.moodValueRow}>
      {words.map((word, i) => (
        <Animated.Text
          key={`${i}-${word}`}
          style={[
            valueStyle,
            {
              opacity: animValues[i].opacity,
              transform: [{ translateY: animValues[i].translateY }],
            },
          ]}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </Animated.Text>
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

export default function MoodSelector({ refreshTrigger, loading = false }) {
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

  return (
    <View style={styles.container}>
      <View style={styles.displayRow}>
        <View style={styles.revealRow}>
          <Text style={styles.label}>Your current mood is</Text>
          {loading ? (
            <SkeletonBar width="38%" />
          ) : (
            <MoodValueReveal
              moodText={currentLabel ?? 'not set'}
              refreshTrigger={refreshTrigger}
              valueStyle={[styles.moodValue, { color: saved ? getMoodColor(saved.emotion) : colors.textSecondary }]}
            />
          )}
        </View>
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
    flexDirection: 'column',
    flex: 1,
    alignItems: 'flex-start',
  },
  moodValueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
