import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, useRecentMeds } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { getTimeNow24h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';

const CTA_HEIGHT = 48;
const CONTROL_RADIUS = 14;
const CHIP_HEIGHT = 36;

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
  const { palette, text } = useTheme();
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

  const saveDisabled = !name.trim();
  const inputStyle = [
    text.body,
    styles.input,
    { backgroundColor: palette.fill },
  ];

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + 12 },
      ]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="chevron-back" size={26} color={palette.label} />
        </Pressable>
        <Text style={text.title2}>log meds.</Text>
      </View>
      <View style={styles.content}>
        {recentMeds.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={[text.eyebrow, styles.label]}>
              {'Recent'.toUpperCase()}
            </Text>
            <View style={styles.chipsRow}>
              {recentMeds.map((med) => (
                <TouchableOpacity
                  key={med.name}
                  accessibilityRole="button"
                  style={[styles.chip, { backgroundColor: palette.fill }]}
                  onPress={() => handleChipPress(med)}
                >
                  <Text style={[text.footnote, { color: palette.tint }]}>
                    {`${med.name} · ${med.dosage} ${med.unit || 'mg'}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Text style={[text.eyebrow, styles.label]}>
          {'Name'.toUpperCase()}
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="Medication name"
          placeholderTextColor={palette.tertiaryLabel}
          value={name}
          onChangeText={setName}
        />
        <Text style={[text.eyebrow, styles.label]}>
          {'Dosage'.toUpperCase()}
        </Text>
        <View style={styles.dosageRow}>
          <TextInput
            style={[...inputStyle, styles.dosageInput]}
            placeholder="0"
            placeholderTextColor={palette.tertiaryLabel}
            value={dosage}
            onChangeText={setDosage}
            keyboardType="number-pad"
          />
          <Text style={[text.body, { color: palette.secondaryLabel }]}>mg</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.saveButton,
            { backgroundColor: palette.label },
            saveDisabled && styles.disabled,
          ]}
          onPress={handleSave}
          disabled={saveDisabled}
        >
          <Text style={[text.headline, { color: palette.background }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    marginBottom: 8,
  },
  chipsSection: {
    marginBottom: 24,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dosageInput: {
    flex: 1,
    marginBottom: 0,
  },
  saveButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
