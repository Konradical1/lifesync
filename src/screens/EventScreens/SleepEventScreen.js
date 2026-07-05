import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../store/mockData';
import { formatTime12h } from '../../utils/time';
import { useTheme } from '../../store/ThemeContext';
import {
  isAppleHealthSleepAvailable,
  requestSleepPermissionAsync,
  fetchSleepSamplesAsync,
} from '../../api/appleHealth';

const CTA_HEIGHT = 48;
const SECONDARY_HEIGHT = 44;
const CONTROL_RADIUS = 14;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime24h(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export default function SleepEventScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette, text } = useTheme();
  const { dispatch } = useStore();

  const getStart = () => {
    const d = new Date();
    d.setHours(23, 0, 0, 0);
    return d;
  };
  const getEnd = () => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  };

  const [startTime, setStartTime] = useState(() => getStart());
  const [endTime, setEndTime] = useState(() => getEnd());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const handleImportFromAppleHealth = async () => {
    if (!isAppleHealthSleepAvailable()) {
      Alert.alert(
        'Not available',
        'Apple Health sleep import is only available on iOS in a development build with react-native-health installed. See APPLE_HEALTH_SLEEP.md.'
      );
      return;
    }
    setImportLoading(true);
    try {
      const granted = await requestSleepPermissionAsync();
      if (!granted) {
        Alert.alert(
          'Access needed',
          'Allow LifeSync to read sleep data in Settings → Health → Data Access.'
        );
        setImportLoading(false);
        return;
      }
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const nights = await fetchSleepSamplesAsync(start, end);
      if (!nights.length) {
        Alert.alert('No data', 'No sleep data found in Apple Health for the last 7 days.');
        setImportLoading(false);
        return;
      }
      const latest = nights[0];
      const startD = new Date(`${latest.date}T${latest.startTime}:00`);
      let endD = new Date(`${latest.date}T${latest.endTime}:00`);
      if (endD <= startD) endD.setDate(endD.getDate() + 1);
      setStartTime(startD);
      setEndTime(endD);
    } catch (e) {
      Alert.alert('Import failed', e?.message || 'Could not read sleep data.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSave = () => {
    const date = formatDateKey(startTime);
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        type: EVENT_TYPES.sleep,
        date,
        startTime: formatTime24h(startTime),
        endTime: formatTime24h(endTime),
      },
    });
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + 12 },
      ]}
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
        <Text style={text.title2}>log sleep.</Text>
      </View>
      <View style={styles.content}>
        <Text style={[text.eyebrow, styles.label]}>
          {'Start time'.toUpperCase()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.timeButton, { backgroundColor: palette.fill }]}
          onPress={() => setShowStart(true)}
        >
          <Text style={text.title2}>{formatTime12h(formatTime24h(startTime))}</Text>
        </TouchableOpacity>
        {showStart && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (d) setStartTime(d);
              if (Platform.OS === 'android') setShowStart(false);
            }}
          />
        )}
        <Text style={[text.eyebrow, styles.label, styles.spacedLabel]}>
          {'End time'.toUpperCase()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.timeButton, { backgroundColor: palette.fill }]}
          onPress={() => setShowEnd(true)}
        >
          <Text style={text.title2}>{formatTime12h(formatTime24h(endTime))}</Text>
        </TouchableOpacity>
        {showEnd && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (d) setEndTime(d);
              if (Platform.OS === 'android') setShowEnd(false);
            }}
          />
        )}
        {isAppleHealthSleepAvailable() && (
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.importButton, { backgroundColor: palette.fill }]}
            onPress={handleImportFromAppleHealth}
            disabled={importLoading}
          >
            {importLoading ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <Text style={[text.subheadline, { color: palette.tint }]}>
                Import from Apple Health
              </Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.saveButton, { backgroundColor: palette.label }]}
          onPress={handleSave}
        >
          <Text style={[text.headline, { color: palette.background }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
  spacedLabel: {
    marginTop: 24,
  },
  timeButton: {
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  importButton: {
    height: SECONDARY_HEIGHT,
    borderRadius: SECONDARY_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  saveButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  pressed: {
    opacity: 0.7,
  },
});
