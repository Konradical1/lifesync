import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useStore, useMood } from "../../store/useStore";
import { MOOD_OPTIONS, generateMoodId } from "../../store/mockData";
import { addMinutesToTime } from "../../utils/time";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../theme/constants";
import { SkeletonBar } from "./SkeletonText";

const MOOD_BLUR_OFFSET = 10;
const MOOD_BLUR_DURATION = 380;
const MOOD_BLUR_STAGGER_MS = 42;

/** Blur-in-by-word animation for the mood value only (same as AI summary). Runs on refresh. */
function MoodValueReveal({ moodText, refreshTrigger, valueStyle }) {
  const words = (moodText || "not set").split(/\s+/).filter(Boolean);
  const [animValues, setAnimValues] = useState([]);
  const prevTriggerRef = useRef(refreshTrigger);
  const prevMoodTextRef = useRef(moodText);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const isRefresh =
      refreshTrigger != null &&
      refreshTrigger > 0 &&
      refreshTrigger !== prevTriggerRef.current;
    const moodChanged = moodText !== prevMoodTextRef.current;
    if (refreshTrigger != null && refreshTrigger > 0)
      prevTriggerRef.current = refreshTrigger;
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
    return <Text style={valueStyle}>{moodText || "not set"}</Text>;
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
          {word}
          {i < words.length - 1 ? " " : ""}
        </Animated.Text>
      ))}
    </View>
  );
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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
  const [emotion, setEmotion] = useState(saved?.emotion ?? "neutral");
  const [intensity, setIntensity] = useState(saved?.intensity ?? 3);

  useEffect(() => {
    setEmotion(saved?.emotion ?? "neutral");
    setIntensity(saved?.intensity ?? 3);
  }, [saved?.emotion, saved?.intensity]);

  useEffect(() => {
    if (modalVisible) {
      setEmotion(saved?.emotion ?? "neutral");
      setIntensity(saved?.intensity ?? 3);
    }
  }, [modalVisible, saved?.emotion, saved?.intensity]);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const startTime = time;
    const endTime = addMinutesToTime(time, 30);
    dispatch({
      type: "ADD_MOOD",
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.moodIconWrap}>
              <Ionicons
                name="happy-outline"
                size={18}
                color={saved ? getMoodColor(saved.emotion) : colors.accent}
              />
            </View>
            <View>
              <Text style={styles.label}>Current mood</Text>
              <Text style={styles.helperText}>Quick check-in for today</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("CalendarTab", {
                screen: "Calendar",
                params: { mode: "mood", focusDate: today },
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.moodStatusRow}>
          <View style={styles.revealRow}>
            {loading ? (
              <SkeletonBar width="46%" />
            ) : (
              <MoodValueReveal
                moodText={currentLabel ?? "Not set"}
                refreshTrigger={refreshTrigger}
                valueStyle={[
                  styles.moodValue,
                  {
                    color: saved
                      ? getMoodColor(saved.emotion)
                      : colors.textSecondary,
                  },
                ]}
              />
            )}
            <Text style={styles.statusCaption}>
              {saved
                ? `Intensity ${saved.intensity}/5`
                : "Tap update when you have a read on it."}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={colors.accent}
            />
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
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>How are you feeling?</Text>
            <Text style={styles.modalSubtitle}>
              Choose the closest match, then set the intensity.
            </Text>

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
                    { backgroundColor: m.color + "30", borderColor: m.color },
                    emotion === m.id && styles.moodChipActive,
                    emotion === m.id && {
                      borderWidth: 2,
                      backgroundColor: m.color + "50",
                    },
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
                Intensity:{" "}
                <Text style={styles.sliderValue}>{Math.round(intensity)}</Text>
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={5}
                step={1}
                value={intensity}
                onValueChange={(v) => setIntensity(v)}
                onSlidingComplete={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
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
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.055)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  moodIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(88,166,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(88,166,255,0.2)",
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: "rgba(13,17,23,0.38)",
  },
  historyButtonText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  revealRow: {
    flexDirection: "column",
    flex: 1,
    alignItems: "flex-start",
    minWidth: 0,
  },
  moodValueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  label: {
    ...typography.caption1,
    color: colors.textPrimary,
  },
  helperText: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 2,
  },
  moodStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  moodValue: {
    fontSize: typography.title2.fontSize,
    fontFamily: typography.fontFamilyBold,
    lineHeight: 34,
  },
  statusCaption: {
    ...typography.footnote,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: "rgba(88,166,255,0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(88,166,255,0.32)",
  },
  updateButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: "600",
    color: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: "#151A21",
    borderRadius: 28,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.title2.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  moodChip: {
    minWidth: 92,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
  },
  moodChipActive: {
    borderWidth: 2,
  },
  moodChipLabel: {
    ...typography.subhead,
  },
  moodChipLabelActive: {
    fontFamily: typography.fontFamilyBold,
  },
  sliderSection: {
    marginBottom: spacing.xl,
  },
  sliderLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sliderValue: {
    color: colors.accent,
    fontWeight: "600",
  },
  slider: {
    width: "100%",
    height: 44,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 18,
  },
  closeButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    fontSize: typography.subhead.fontSize,
    fontWeight: "600",
    color: colors.background,
  },
});
