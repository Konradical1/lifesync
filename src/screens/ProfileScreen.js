import React, { useState, useCallback, useRef } from "react";
import {
  ScrollView,
  FlatList,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { suggestGoals } from "../utils/goalSuggest";
import { colors, spacing, typography, borderRadius } from "../theme/constants";

import ProfileHeader from "../components/Profile/ProfileHeader";
import QuickStatsRow from "../components/Profile/QuickStatsRow";
import WeightCard from "../components/Profile/WeightCard";
import TrendsCard from "../components/Profile/TrendsCard";
import HealthNotesCard from "../components/Profile/HealthNotesCard";
import AboutYouSection from "../components/Profile/AboutYouSection";
import WeightPicker from "../components/Profile/WeightPicker";

const FIELD_CONFIG = {
  name: { label: "Name", placeholder: "Your name", keyboard: "default" },
  age: { label: "Age", placeholder: "e.g. 28", keyboard: "numeric" },
  height: {
    label: "Height",
    placeholder: "e.g. 5'10\" or 178 cm",
    keyboard: "default",
  },
  gender: {
    label: "Gender",
    placeholder: "e.g. Male, Female, Non-binary",
    keyboard: "default",
  },
  calorieGoal: {
    label: "Daily Calorie Goal",
    placeholder: "e.g. 2200",
    keyboard: "numeric",
  },
  proteinGoal: {
    label: "Daily Protein Goal (g)",
    placeholder: "e.g. 120",
    keyboard: "numeric",
  },
  waterGoalOz: {
    label: "Daily Water Goal (oz)",
    placeholder: "e.g. 64",
    keyboard: "numeric",
  },
  medicalConditions: {
    label: "Health Notes",
    placeholder: "Any current conditions, allergies, medications, etc.",
    keyboard: "default",
    multiline: true,
  },
  aiContext: {
    label: "AI Context",
    placeholder:
      "Tell the AI anything about yourself — dietary preferences, fitness goals, health history, lifestyle context…",
    keyboard: "default",
    multiline: true,
  },
};

function formatLogDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function generateId() {
  return "wl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { state, dispatch } = useStore();
  const { profile } = state;

  // Text field editor state
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isLargeModal, setIsLargeModal] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const inputRef = useRef(null);

  // Weight picker state
  const [weightPickerVisible, setWeightPickerVisible] = useState(false);
  const [weightPickerField, setWeightPickerField] = useState(null); // 'weight' | 'weightGoal'
  const [pickerValue, setPickerValue] = useState("150");

  // Weight history modal state
  const [weightHistoryVisible, setWeightHistoryVisible] = useState(false);

  // --- Text field editor ---
  const saveField = useCallback(
    (field, value) => {
      dispatch({
        type: "UPDATE_PROFILE",
        payload: { [field]: value.trim() },
      });
    },
    [dispatch],
  );

  const openFieldEditor = useCallback(
    (field, large = false) => {
      if (field === "weight" || field === "weightGoal") {
        setWeightPickerField(field);
        setPickerValue(profile[field] || "150");
        setWeightPickerVisible(true);
        return;
      }
      setEditValue(profile[field] ?? "");
      setEditingField(field);
      setIsLargeModal(large || FIELD_CONFIG[field]?.multiline);
    },
    [profile],
  );

  const closeFieldEditor = useCallback(() => {
    if (editingField) {
      saveField(editingField, editValue);
    }
    setEditingField(null);
    setEditValue("");
    setIsLargeModal(false);
  }, [editingField, editValue, saveField]);

  // --- Weight picker ---
  const handleWeightPickerDone = useCallback(() => {
    const numStr = pickerValue.trim();
    if (weightPickerField === "weight") {
      dispatch({
        type: "ADD_WEIGHT_LOG",
        payload: {
          id: generateId(),
          weight: numStr,
          date: formatDateKey(new Date()),
          createdAt: new Date().toISOString(),
        },
      });
    } else if (weightPickerField === "weightGoal") {
      dispatch({
        type: "UPDATE_PROFILE",
        payload: { weightGoal: numStr },
      });
    }
    setWeightPickerVisible(false);
    setWeightPickerField(null);
  }, [pickerValue, weightPickerField, dispatch]);

  const closeWeightPicker = useCallback(() => {
    setWeightPickerVisible(false);
    setWeightPickerField(null);
  }, []);

  // --- Suggest goals ---
  const handleSuggestGoals = useCallback(() => {
    setSuggestError("");
    const result = suggestGoals({
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
    });
    if (result.error) {
      setSuggestError(result.error);
      return;
    }
    dispatch({
      type: "UPDATE_PROFILE",
      payload: {
        calorieGoal: String(result.calorieGoal),
        proteinGoal: String(result.proteinGoal),
      },
    });
    setSuggestError("");
  }, [profile.age, profile.height, profile.weight, dispatch]);

  const config = editingField ? FIELD_CONFIG[editingField] : null;
  const weightLogs = state.weightLogs || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>About you</Text>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeader
          name={profile.name}
          height={profile.height}
          gender={profile.gender}
          weight={profile.weight}
        />

        <QuickStatsRow
          profile={profile}
          onEditField={(key) => openFieldEditor(key)}
        />

        <WeightCard
          weight={profile.weight}
          weightGoal={profile.weightGoal}
          onUpdateWeight={() => openFieldEditor("weight")}
          onViewHistory={() => setWeightHistoryVisible(true)}
        />

        <TrendsCard
          events={state.events}
          moodEntries={state.moodEntries}
          journal={state.journal}
        />

        <HealthNotesCard
          medicalConditions={profile.medicalConditions}
          onEdit={() => openFieldEditor("medicalConditions", true)}
        />

        <AboutYouSection
          profile={profile}
          onEditField={(key, large) => openFieldEditor(key, large)}
        />

        <View style={styles.suggestWrap}>
          <TouchableOpacity
            style={styles.suggestButton}
            onPress={handleSuggestGoals}
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
            <Text style={styles.suggestButtonText}>
              Suggest goals from profile
            </Text>
          </TouchableOpacity>
          {suggestError ? (
            <Text style={styles.suggestError}>{suggestError}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* ===== Text Field Editor Modal ===== */}
      <Modal
        visible={editingField !== null}
        animationType="slide"
        transparent
        onRequestClose={closeFieldEditor}
      >
        <Pressable style={styles.modalOverlay} onPress={closeFieldEditor}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <Pressable
              style={[
                styles.modalContent,
                isLargeModal && styles.modalContentLarge,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{config?.label ?? ""}</Text>
                <TouchableOpacity onPress={closeFieldEditor}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                ref={inputRef}
                style={[
                  styles.modalInput,
                  isLargeModal && styles.modalInputLarge,
                ]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={config?.placeholder}
                placeholderTextColor={colors.textTertiary}
                keyboardType={config?.keyboard ?? "default"}
                multiline={isLargeModal}
                autoFocus
                returnKeyType={isLargeModal ? "default" : "done"}
                onSubmitEditing={isLargeModal ? undefined : closeFieldEditor}
                textAlignVertical={isLargeModal ? "top" : "center"}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ===== Weight Picker Modal ===== */}
      <Modal
        visible={weightPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={closeWeightPicker}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalOverlayDismiss}
            onPress={closeWeightPicker}
          />
          <View
            style={[
              styles.modalContent,
              styles.pickerModalContent,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {weightPickerField === "weightGoal"
                  ? "Weight Goal"
                  : "Update Weight"}
              </Text>
              <TouchableOpacity onPress={handleWeightPickerDone}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <WeightPicker value={pickerValue} onValueChange={setPickerValue} />
          </View>
        </View>
      </Modal>

      {/* ===== Weight History Modal ===== */}
      <Modal
        visible={weightHistoryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWeightHistoryVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setWeightHistoryVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              styles.historyModalContent,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Weight History</Text>
              <TouchableOpacity onPress={() => setWeightHistoryVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            {weightLogs.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons
                  name="scale-outline"
                  size={36}
                  color={colors.textTertiary}
                />
                <Text style={styles.historyEmptyText}>
                  No weight logs yet. Tap "Update weight" to add your first
                  entry.
                </Text>
              </View>
            ) : (
              <FlatList
                data={weightLogs}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={styles.historyList}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.historyRow,
                      index < weightLogs.length - 1 && styles.historyRowBorder,
                    ]}
                  >
                    <View style={styles.historyRowLeft}>
                      <Text style={styles.historyWeight}>
                        {item.weight} lbs
                      </Text>
                      <Text style={styles.historyDate}>
                        {formatLogDate(item.createdAt)}
                      </Text>
                    </View>
                    {index > 0 &&
                      (() => {
                        const prev = parseInt(weightLogs[index - 1].weight, 10);
                        const curr = parseInt(item.weight, 10);
                        if (isNaN(prev) || isNaN(curr)) return null;
                        const diff = prev - curr;
                        if (diff === 0) return null;
                        return (
                          <View style={styles.historyDiff}>
                            <Ionicons
                              name={diff > 0 ? "arrow-up" : "arrow-down"}
                              size={14}
                              color={
                                diff > 0 ? colors.eventMeds : colors.eventFood
                              }
                            />
                            <Text
                              style={[
                                styles.historyDiffText,
                                {
                                  color:
                                    diff > 0
                                      ? colors.eventMeds
                                      : colors.eventFood,
                                },
                              ]}
                            >
                              {Math.abs(diff)} lbs
                            </Text>
                          </View>
                        );
                      })()}
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerEyebrow: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: typography.title1.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 140,
  },

  /* Suggest Goals */
  suggestWrap: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(88,166,255,0.1)",
    borderRadius: 20,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  suggestButtonText: {
    fontSize: typography.callout.fontSize,
    color: colors.accent,
    fontWeight: "600",
    fontFamily: typography.fontFamilySemiBold,
  },
  suggestError: {
    fontSize: typography.footnote.fontSize,
    color: colors.eventMeds,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  /* Shared Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalOverlayDismiss: {
    flex: 1,
  },
  modalKeyboard: {
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#151A21",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    minHeight: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalContentLarge: {
    minHeight: 300,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  modalDone: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
    fontWeight: "600",
    fontFamily: typography.fontFamilySemiBold,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalInputLarge: {
    minHeight: 180,
    textAlignVertical: "top",
  },

  /* Weight Picker Modal */
  pickerModalContent: {
    minHeight: 320,
    alignItems: "stretch",
  },

  /* Weight History Modal */
  historyModalContent: {
    minHeight: 300,
    maxHeight: "70%",
  },
  historyList: {
    flex: 1,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  historyRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyRowLeft: {
    flex: 1,
  },
  historyWeight: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    fontFamily: typography.fontFamilySemiBold,
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: typography.caption1.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    marginTop: 2,
  },
  historyDiff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  historyDiffText: {
    fontSize: typography.footnote.fontSize,
    fontWeight: "600",
    fontFamily: typography.fontFamilySemiBold,
  },
  historyEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  historyEmptyText: {
    fontSize: typography.subhead.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});
