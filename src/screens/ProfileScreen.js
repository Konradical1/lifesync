import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { suggestGoals } from '../utils/goalSuggest';
import { colors, spacing, typography, borderRadius } from '../theme/constants';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { state, dispatch } = useStore();
  const { profile } = state;

  const [name, setName] = useState(profile.name ?? '');
  const [age, setAge] = useState(profile.age ?? '');
  const [height, setHeight] = useState(profile.height ?? '');
  const [weight, setWeight] = useState(profile.weight ?? '');
  const [medicalConditions, setMedicalConditions] = useState(profile.medicalConditions ?? '');
  const [calorieGoal, setCalorieGoal] = useState(profile.calorieGoal ?? '');
  const [proteinGoal, setProteinGoal] = useState(profile.proteinGoal ?? '');
  const [waterGoalOz, setWaterGoalOz] = useState(profile.waterGoalOz ?? '');
  const [suggestError, setSuggestError] = useState('');

  useEffect(() => {
    setName(profile.name ?? '');
    setAge(profile.age ?? '');
    setHeight(profile.height ?? '');
    setWeight(profile.weight ?? '');
    setMedicalConditions(profile.medicalConditions ?? '');
    setCalorieGoal(profile.calorieGoal ?? '');
    setProteinGoal(profile.proteinGoal ?? '');
    setWaterGoalOz(profile.waterGoalOz ?? '');
  }, [
    profile.name,
    profile.age,
    profile.height,
    profile.weight,
    profile.medicalConditions,
    profile.calorieGoal,
    profile.proteinGoal,
    profile.waterGoalOz,
  ]);

  const handleSuggestGoals = () => {
    setSuggestError('');
    const result = suggestGoals({ age, height, weight });
    if (result.error) {
      setSuggestError(result.error);
      return;
    }
    setCalorieGoal(String(result.calorieGoal));
    setProteinGoal(String(result.proteinGoal));
  };

  const saveProfile = () => {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: {
        name: name.trim(),
        age: age.trim(),
        height: height.trim(),
        weight: weight.trim(),
        medicalConditions: medicalConditions.trim(),
        calorieGoal: calorieGoal.trim(),
        proteinGoal: proteinGoal.trim(),
        waterGoalOz: waterGoalOz.trim(),
      },
    });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.backLink} onPress={() => navigation.goBack()}>
          ← Back
        </Text>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={saveProfile}>
          <Text style={styles.saveLink}>Save</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="e.g. 28"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Height</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            placeholder={`e.g. 5'10" or 178 cm`}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Weight</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 70 kg or 154 lbs"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Medical conditions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholder="Any current conditions, allergies, medications, etc."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Daily calorie goal</Text>
          <TextInput
            style={styles.input}
            value={calorieGoal}
            onChangeText={setCalorieGoal}
            placeholder="e.g. 2200"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Daily protein goal (g)</Text>
          <TextInput
            style={styles.input}
            value={proteinGoal}
            onChangeText={setProteinGoal}
            placeholder="e.g. 120"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Daily water goal (oz)</Text>
          <TextInput
            style={styles.input}
            value={waterGoalOz}
            onChangeText={setWaterGoalOz}
            placeholder="e.g. 64"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity style={styles.suggestButton} onPress={handleSuggestGoals}>
          <Text style={styles.suggestButtonText}>Suggest goals from profile</Text>
        </TouchableOpacity>
        {suggestError ? <Text style={styles.suggestError}>{suggestError}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  title: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    color: colors.textPrimary,
  },
  saveLink: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  suggestButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  suggestButtonText: {
    fontSize: typography.callout.fontSize,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestError: {
    fontSize: typography.footnote.fontSize,
    color: colors.eventMeds,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
  },
});
