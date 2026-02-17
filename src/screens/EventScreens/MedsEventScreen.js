import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, useRecentMeds } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export default function MedsEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();
  const recentMeds = useRecentMeds();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');

  const handleChipPress = (med) => {
    setName(med.name);
    setDosage(med.dosage ? String(med.dosage) : '');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const date = formatDateKey(new Date());
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        type: EVENT_TYPES.meds,
        date,
        time: getTimeNow24h(),
        name: name.trim(),
        dosage: parseInt(dosage, 10) || 0,
        unit: 'mg',
      },
    });
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Meds</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.body}>
        {recentMeds.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.label}>Recent</Text>
            <View style={styles.chipsRow}>
              {recentMeds.map((med) => (
                <TouchableOpacity
                  key={med.name}
                  style={styles.chip}
                  onPress={() => handleChipPress(med)}
                >
                  <Text style={styles.chipText}>
                    {`${med.name} · ${med.dosage} ${med.unit || 'mg'}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Medication name"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Dosage</Text>
        <View style={styles.dosageRow}>
          <TextInput
            style={[styles.input, styles.dosageInput]}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            value={dosage}
            onChangeText={setDosage}
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>mg</Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={!name.trim()}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textPrimary,
  },
  body: {
    padding: spacing.md,
  },
  chipsSection: {
    marginBottom: spacing.lg,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: typography.footnote.fontSize,
    color: colors.accent,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dosageInput: {
    flex: 1,
    marginBottom: 0,
  },
  unit: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.background,
  },
});
