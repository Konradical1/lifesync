/**
 * Snap-and-go food queue. Every snapped or typed meal lands here and is
 * estimated in the background (up to 3 at once), then added as a normal food
 * event with its original date/time. Offline items wait and retry.
 */
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import { analyzeFood } from '../api/ai';
import { EVENT_TYPES } from './mockData';

const STORAGE_KEY = '@lifesync_pending_food';
const RETRY_MS = 60000;
const MAX_PARALLEL = 3;

// { id, image?, text?, date, time, goal?, status: 'analyzing' | 'waiting' | 'error', error? }
let items = [];
const listeners = new Set();
const inFlight = new Set();
let dispatchRef = null;

function setItems(next) {
  items = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
}

function patch(id, changes) {
  setItems(items.map((i) => (i.id === id ? { ...i, ...changes } : i)));
}

function fail(id, error) {
  patch(id, { status: 'error', error });
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

/**
 * Add a meal and start estimating it right away (light haptic; callers don't add their own).
 * @param {{ image?: string, text?: string, date: string, time: string, goal?: 'gain'|'maintain'|'lose' }} entry
 */
export function queueFood(entry) {
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  setItems([...items, { id, ...entry, status: 'analyzing' }]);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  run();
}

export function retryPending(id) {
  patch(id, { status: 'analyzing', error: undefined });
  run();
}

export function removePending(id) {
  setItems(items.filter((i) => i.id !== id));
}

/** Drop the whole queue on sign-out so one account's meals never land in another. */
export function clearPendingFood() {
  setItems([]);
}

async function analyze(item) {
  inFlight.add(item.id);
  try {
    const res = await analyzeFood({ image: item.image, text: item.text, goal: item.goal });
    if (!items.some((i) => i.id === item.id)) return; // removed while analyzing
    if (res.offline || !dispatchRef) return patch(item.id, { status: 'waiting' });
    if (!res.ok) return fail(item.id, res.error || 'Could not estimate');
    dispatchRef({
      type: 'ADD_EVENT',
      payload: {
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
        type: EVENT_TYPES.food,
        date: item.date,
        time: item.time,
        ...res.data,
        description: res.data.description || item.text || 'Meal',
      },
    });
    removePending(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    fail(item.id, 'Could not estimate');
  } finally {
    inFlight.delete(item.id);
    run();
  }
}

/** Start every ready item, up to MAX_PARALLEL requests at once. */
function run() {
  if (!dispatchRef) return;
  for (const item of items) {
    if (inFlight.size >= MAX_PARALLEL) return;
    if (item.status === 'analyzing' && !inFlight.has(item.id)) analyze(item);
  }
}

/** Waiting (offline) items get another try. */
function retryWaiting() {
  if (items.some((i) => i.status === 'waiting')) {
    setItems(items.map((i) => (i.status === 'waiting' ? { ...i, status: 'analyzing' } : i)));
  }
  run();
}

/** Load the saved queue and keep draining it whenever we're (back) online. Returns cleanup. */
export function startPendingFoodSync(dispatch) {
  dispatchRef = dispatch;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const saved = raw ? JSON.parse(raw) : [];
      const known = new Set(items.map((i) => i.id));
      // Older builds saved items without a status (an error stays an error, the rest run
      // again) and could save the same item twice on a remount: restore each id once.
      const restored = (Array.isArray(saved) ? saved : [])
        .filter((i) => i?.id && !known.has(i.id) && known.add(i.id))
        .map((i) => ({ ...i, status: i.status === 'error' || i.error ? 'error' : 'analyzing' }));
      if (restored.length) setItems([...restored, ...items]);
      retryWaiting();
    })
    .catch(() => {});
  const net = Network.addNetworkStateListener((s) => {
    if ((s.isInternetReachable ?? s.isConnected) !== false) retryWaiting();
  });
  const app = AppState.addEventListener('change', (s) => s === 'active' && retryWaiting());
  // ponytail: fixed 60s retry while items wait; backoff if this ever matters for battery.
  const timer = setInterval(retryWaiting, RETRY_MS);
  return () => {
    dispatchRef = null;
    net.remove();
    app.remove();
    clearInterval(timer);
  };
}
