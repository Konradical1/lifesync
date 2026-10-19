/**
 * Offline food queue. Meals logged without internet are saved here (photo as
 * a small base64 JPEG, or typed text) and estimated once we're back online,
 * then added as normal food events with their original date/time.
 */
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { analyzeFoodPhoto, extractFood } from '../api/ai';
import { EVENT_TYPES } from './mockData';

const STORAGE_KEY = '@lifesync_pending_food';
const RETRY_MS = 60000;

let items = [];
const listeners = new Set();

function setItems(next) {
  items = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
}

export function usePendingFood() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items
  );
}

export async function isOnline() {
  try {
    const s = await Network.getNetworkStateAsync();
    return (s.isInternetReachable ?? s.isConnected) !== false;
  } catch {
    return true; // can't tell: just try the request
  }
}

/** @param {{ image?: string, text?: string, date: string, time: string }} entry */
export function queueFood(entry) {
  setItems([...items, { id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), ...entry }]);
}

export function removePending(id) {
  setItems(items.filter((i) => i.id !== id));
}

let running = false;

async function processQueue(dispatch) {
  if (running || !items.length) return;
  running = true;
  try {
    for (const item of items.filter((i) => !i.error)) {
      const res = item.image ? await analyzeFoodPhoto(item.image) : await extractFood(item.text);
      if (res.offline) break; // still no connection; try again later
      if (!res.ok) {
        setItems(items.map((i) => (i.id === item.id ? { ...i, error: res.error || 'Could not estimate' } : i)));
        continue;
      }
      const d = res.data;
      dispatch({
        type: 'ADD_EVENT',
        payload: {
          id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
          type: EVENT_TYPES.food,
          date: item.date,
          time: item.time,
          description: d.description || item.text || 'Meal',
          calories: d.calories,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
          note: d.portion || undefined,
        },
      });
      removePending(item.id);
    }
  } finally {
    running = false;
  }
}

/** Load the queue and keep draining it whenever we're (back) online. Returns cleanup. */
export function startPendingFoodSync(dispatch) {
  const run = () => processQueue(dispatch).catch(() => {});
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const saved = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved) && saved.length) setItems([...saved, ...items]);
      run();
    })
    .catch(() => {});
  const net = Network.addNetworkStateListener((s) => {
    if ((s.isInternetReachable ?? s.isConnected) !== false) run();
  });
  const app = AppState.addEventListener('change', (s) => s === 'active' && run());
  // ponytail: fixed 60s retry while items wait; backoff if this ever matters for battery.
  const timer = setInterval(run, RETRY_MS);
  return () => {
    net.remove();
    app.remove();
    clearInterval(timer);
  };
}
