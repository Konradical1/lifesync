/**
 * Optional Apple Health (HealthKit) bridge for reading sleep data.
 * Only works on iOS when react-native-health is installed and linked (dev build).
 * Safe to use from Expo Go: APIs return false / [] when HealthKit is unavailable.
 */

import { Platform } from 'react-native';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Format Date to app date key (YYYY-MM-DD) */
function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Format Date to 24h time string (HH:mm) */
function toTime24h(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Merge HealthKit sleep samples into one block per night.
 * Samples have startDate, endDate (ISO strings). Multiple segments (INBED, ASLEEP, AWAKE)
 * are merged so we get one { start, end } per calendar night (by start date).
 */
function mergeSamplesIntoNights(samples) {
  if (!samples?.length) return [];
  const byNight = new Map(); // dateKey -> { startMs, endMs }
  samples.forEach((s) => {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    const dateKey = toDateKey(new Date(s.startDate));
    const existing = byNight.get(dateKey);
    if (!existing) {
      byNight.set(dateKey, { startMs: start, endMs: end });
    } else {
      existing.startMs = Math.min(existing.startMs, start);
      existing.endMs = Math.max(existing.endMs, end);
    }
  });
  return Array.from(byNight.entries())
    .map(([date, { startMs, endMs }]) => ({
      date,
      startTime: toTime24h(new Date(startMs)),
      endTime: toTime24h(new Date(endMs)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

let healthKitRef = null;

function getHealthKit() {
  if (healthKitRef !== null) return healthKitRef;
  if (Platform.OS !== 'ios') {
    healthKitRef = false;
    return false;
  }
  try {
    const AppleHealthKit = require('react-native-health').default;
    healthKitRef = AppleHealthKit;
    return AppleHealthKit;
  } catch (e) {
    healthKitRef = false;
    return false;
  }
}

const SLEEP_READ = 'SleepAnalysis';

/**
 * @returns {boolean} True if Apple Health sleep import is available (iOS + react-native-health linked).
 */
export function isAppleHealthSleepAvailable() {
  return !!getHealthKit();
}

/**
 * Initialize HealthKit and request sleep read permission.
 * @returns {Promise<boolean>} True if permission granted (or already granted).
 */
export function requestSleepPermissionAsync() {
  const HK = getHealthKit();
  if (!HK) return Promise.resolve(false);
  return new Promise((resolve) => {
    HK.initHealthKit(
      {
        permissions: {
          read: [SLEEP_READ],
          write: [],
        },
      },
      (err) => {
        resolve(!err);
      }
    );
  });
}

/**
 * Fetch sleep samples from HealthKit and convert to app format.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array<{ date: string, startTime: string, endTime: string }>>}
 */
export function fetchSleepSamplesAsync(startDate, endDate) {
  const HK = getHealthKit();
  if (!HK) return Promise.resolve([]);
  return new Promise((resolve) => {
    HK.getSleepSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err, samples) => {
        if (err || !Array.isArray(samples)) {
          resolve([]);
          return;
        }
        resolve(mergeSamplesIntoNights(samples));
      }
    );
  });
}
