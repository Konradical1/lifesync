import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useStore, useMood } from "../../store/useStore";
import { MOOD_OPTIONS, generateMoodId } from "../../store/mockData";
import { addMinutesToTime } from "../../utils/time";
import Card from "../ui/Card";
import { useTheme } from "../../store/ThemeContext";
import { SkeletonBar } from "./SkeletonText";

const MOOD_BLUR_OFFSET = 10;
const MOOD_BLUR_DURATION = 380;
const MOOD_BLUR_STAGGER_MS = 42;
const MOOD_DURATION_MINUTES = 30;

/** Staggered word reveal for the mood value (same treatment as the summary). */
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

function getMoodColor(id, fallback) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.color ?? fallback;
}

export default function MoodSelector({ refreshTrigger, loading = false }) {
  const { palette, text, shape } = useTheme();
  const today = formatDateKey(new Date());
  const saved = useMood(today);
  const { dispatch } = useStore();
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
    const endTime = addMinutesToTime(time, MOOD_DURATION_MINUTES);
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
      <Card>
        <View style={styles.row}>
          <View style={styles.valueColumn}>
            {loading ? (
              <SkeletonBar width="46%" />
            ) : (
              <MoodValueReveal
                moodText={currentLabel ?? "Not logged"}
                refreshTrigger={refreshTrigger}
                valueStyle={[
                  text.title2,
                  {
                    color: saved
                      ? getMoodColor(saved.emotion, palette.secondaryLabel)
                      : palette.secondaryLabel,
                  },
                ]}
              />
            )}
            <Text style={[text.caption, styles.subLine]}>
              {saved
                ? `INTENSITY ${saved.intensity} OF 5`
                : "HOW ARE YOU FEELING?"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log mood"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.logButton,
              { backgroundColor: palette.label },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={17} color={palette.background} />
            <Text style={[text.subheadline, { color: palette.background }]}>
              Log Mood
            </Text>
          </Pressable>
        </View>
      </Card>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: palette.cardElevated,
                borderRadius: shape.cardRadius,
                borderCurve: shape.borderCurve,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[text.title2, styles.modalTitle]}>
              How are you feeling?
            </Text>

            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((m) => {
                const isSelected = emotion === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEmotion(m.id);
                    }}
                    style={[
                      styles.moodChip,
                      { backgroundColor: isSelected ? m.color : palette.fill },
                    ]}
                  >
                    <Text
                      style={[
                        text.subheadline,
                        isSelected && styles.moodChipLabelSelected,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sliderSection}>
              <Text style={[text.subheadline, { color: palette.secondaryLabel }]}>
                Intensity{" "}
                <Text style={{ color: palette.label }}>
                  {Math.round(intensity)}
                </Text>
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
                minimumTrackTintColor={getMoodColor(emotion, palette.tint)}
                maximumTrackTintColor={palette.fill}
                thumbTintColor={palette.label}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.modalButton,
                  { backgroundColor: palette.fill, borderCurve: shape.borderCurve },
                ]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={[text.headline, { color: palette.label }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.modalButton,
                  { backgroundColor: palette.tint, borderCurve: shape.borderCurve },
                ]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={[text.headline, { color: "#FFFFFF" }]}>Save</Text>
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
    marginHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  valueColumn: {
    flex: 1,
    minWidth: 0,
  },
  subLine: {
    marginTop: 4,
    letterSpacing: 0.6,
  },
  moodValueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 10,
    paddingRight: 14,
    height: 36,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    padding: 24,
    width: "100%",
    maxWidth: 380,
  },
  modalTitle: {
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  moodChip: {
    minWidth: 88,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  moodChipLabelSelected: {
    color: "#000000",
  },
  sliderSection: {
    marginBottom: 24,
  },
  slider: {
    width: "100%",
    height: 44,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
});
