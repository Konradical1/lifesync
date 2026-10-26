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
import { useTheme } from "../store/ThemeContext";

import Card from "../components/ui/Card";
import SegmentedControl from "../components/ui/SegmentedControl";
import ProfileHeader from "../components/Profile/ProfileHeader";
import QuickStatsRow from "../components/Profile/QuickStatsRow";
import WeightCard from "../components/Profile/WeightCard";
import TrendsCard from "../components/Profile/TrendsCard";
import HealthNotesCard from "../components/Profile/HealthNotesCard";
import AboutYouSection from "../components/Profile/AboutYouSection";
import WeightPicker from "../components/Profile/WeightPicker";

const { suggestGoals } = require("../utils/goalSuggest");
const { dailyTargets } = require("../utils/nutrition");

const SCREEN_MARGIN = 20;
const TAB_BAR_CLEARANCE = 140;
const PILL_HEIGHT = 40;
const PILL_RADIUS = 20;
const MODAL_SCRIM = "rgba(0,0,0,0.5)";

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
  carbGoal: {
    label: "Daily Carb Goal (g)",
    placeholder: "e.g. 300",
    keyboard: "numeric",
  },
  fatGoal: {
    label: "Daily Fat Goal (g)",
    placeholder: "e.g. 90",
    keyboard: "numeric",
  },
  fiberGoal: {
    label: "Daily Fiber Goal (g)",
    placeholder: "e.g. 35",
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

// Goal, sex and activity feed the suggested targets (suggestGoals).
const PLAN_PICKERS = [
  {
    field: "goalType",
    label: "Goal",
    options: [
      { key: "gain", label: "Gain" },
      { key: "maintain", label: "Maintain" },
      { key: "lose", label: "Lose" },
    ],
  },
  {
    field: "sex",
    label: "Sex",
    options: [
      { key: "male", label: "Male" },
      { key: "female", label: "Female" },
    ],
  },
  {
    field: "activity",
    label: "Activity",
    options: [
      { key: "sedentary", label: "Sedentary" },
      { key: "light", label: "Light" },
      { key: "moderate", label: "Moderate" },
      { key: "active", label: "Active" },
    ],
  },
];

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

/** Centered letterspaced-caps section divider (mirrors HomeScreen). */
function SectionHeader({ title }) {
  const { text } = useTheme();
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={text.eyebrow}>{title.toUpperCase()}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { palette, text, shape } = useTheme();
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

  // --- Suggested goals ---
  // Blank goals follow Goal, Sex and Activity (dailyTargets), so clear the
  // saved overrides instead of freezing today's suggestion.
  const handleSuggestGoals = useCallback(() => {
    setSuggestError("");
    const result = suggestGoals(profile);
    if (result.error) {
      setSuggestError(result.error);
      return;
    }
    dispatch({
      type: "UPDATE_PROFILE",
      payload: { calorieGoal: "", proteinGoal: "", carbGoal: "", fatGoal: "", fiberGoal: "" },
    });
  }, [profile, dispatch]);

  const config = editingField ? FIELD_CONFIG[editingField] : null;
  const weightLogs = state.weightLogs || [];
  const targets = dailyTargets(profile);

  const modalSurface = {
    backgroundColor: palette.card,
    borderCurve: shape.borderCurve,
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color={palette.label} />
        </TouchableOpacity>
        <Text style={text.display}>your profile.</Text>
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

        <SectionHeader title="Daily goals" />
        <Card style={styles.planCard}>
          {PLAN_PICKERS.map(({ field, label, options }, i) => (
            <View key={field} style={i > 0 && styles.planRow}>
              <Text style={[text.eyebrow, styles.planLabel]}>
                {label.toUpperCase()}
              </Text>
              <SegmentedControl
                options={options}
                value={profile[field]}
                onChange={(key) =>
                  dispatch({ type: "UPDATE_PROFILE", payload: { [field]: key } })
                }
                accessibilityLabel={label}
              />
            </View>
          ))}
        </Card>
        <QuickStatsRow
          profile={profile}
          targets={targets}
          onEditField={(key) => openFieldEditor(key)}
        />
        <View style={styles.suggestWrap}>
          <TouchableOpacity
            style={[styles.suggestButton, { backgroundColor: palette.fill }]}
            onPress={handleSuggestGoals}
            accessibilityRole="button"
            accessibilityLabel="Use suggested goals"
          >
            <Ionicons name="sparkles-outline" size={16} color={palette.tint} />
            <Text style={[text.subheadline, { color: palette.tint }]}>
              Use suggested goals
            </Text>
          </TouchableOpacity>
          {suggestError ? (
            <Text
              style={[text.footnote, styles.suggestError, { color: palette.red }]}
            >
              {suggestError}
            </Text>
          ) : null}
        </View>

        <SectionHeader title="Body" />
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

        <SectionHeader title="Health notes" />
        <HealthNotesCard
          medicalConditions={profile.medicalConditions}
          onEdit={() => openFieldEditor("medicalConditions", true)}
        />

        <SectionHeader title="About you" />
        <AboutYouSection
          profile={profile}
          onEditField={(key, large) => openFieldEditor(key, large)}
        />
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
                modalSurface,
                isLargeModal && styles.modalContentLarge,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalHandle, { backgroundColor: palette.fill }]}
              />
              <View style={styles.modalHeader}>
                <Text style={text.title3}>{config?.label ?? ""}</Text>
                <TouchableOpacity
                  onPress={closeFieldEditor}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text style={[text.subheadline, { color: palette.tint }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                ref={inputRef}
                style={[
                  text.body,
                  styles.modalInput,
                  {
                    backgroundColor: palette.fill,
                    borderRadius: shape.controlRadius,
                  },
                  isLargeModal && styles.modalInputLarge,
                ]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={config?.placeholder}
                placeholderTextColor={palette.tertiaryLabel}
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
              modalSurface,
              styles.pickerModalContent,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View
              style={[styles.modalHandle, { backgroundColor: palette.fill }]}
            />
            <View style={styles.modalHeader}>
              <Text style={text.title3}>
                {weightPickerField === "weightGoal"
                  ? "Weight Goal"
                  : "Update Weight"}
              </Text>
              <TouchableOpacity
                onPress={handleWeightPickerDone}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text style={[text.subheadline, { color: palette.tint }]}>
                  Done
                </Text>
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
              modalSurface,
              styles.historyModalContent,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[styles.modalHandle, { backgroundColor: palette.fill }]}
            />
            <View style={styles.modalHeader}>
              <Text style={text.title3}>Weight History</Text>
              <TouchableOpacity
                onPress={() => setWeightHistoryVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text style={[text.subheadline, { color: palette.tint }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {weightLogs.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons
                  name="scale-outline"
                  size={36}
                  color={palette.tertiaryLabel}
                />
                <Text style={[text.footnote, styles.historyEmptyText]}>
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
                      index < weightLogs.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: palette.separator,
                      },
                    ]}
                  >
                    <View style={styles.historyRowLeft}>
                      <Text style={text.headline}>{item.weight} lbs</Text>
                      <Text style={[text.footnote, styles.historyDate]}>
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
                        const diffColor =
                          diff > 0 ? palette.red : palette.green;
                        return (
                          <View style={styles.historyDiff}>
                            <Ionicons
                              name={diff > 0 ? "arrow-up" : "arrow-down"}
                              size={14}
                              color={diffColor}
                            />
                            <Text style={[text.caption, { color: diffColor }]}>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SCREEN_MARGIN,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginHorizontal: SCREEN_MARGIN,
    marginTop: 30,
    marginBottom: 12,
  },

  /* Plan (goal, sex, activity) */
  planCard: {
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: 8,
  },
  planRow: {
    marginTop: 16,
  },
  planLabel: {
    marginBottom: 8,
  },

  /* Suggest Goals (QuickStatsRow's marginBottom spaces it from the chips) */
  suggestWrap: {
    marginHorizontal: SCREEN_MARGIN,
  },
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
  },
  suggestError: {
    marginTop: 8,
    textAlign: "center",
  },

  /* Shared Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: MODAL_SCRIM,
    justifyContent: "flex-end",
  },
  modalOverlayDismiss: {
    flex: 1,
  },
  modalKeyboard: {
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SCREEN_MARGIN,
    paddingTop: 12,
    minHeight: 160,
  },
  modalContentLarge: {
    minHeight: 300,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  historyRowLeft: {
    flex: 1,
  },
  historyDate: {
    marginTop: 2,
  },
  historyDiff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  historyEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  historyEmptyText: {
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
