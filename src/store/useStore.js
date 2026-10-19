import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { EVENT_TYPES } from './mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startPendingFoodSync } from './pendingFood';
import { isSupabaseConfigured } from '../api/supabase';
import { loadFromSupabase, saveFullStateToSupabase } from '../api/supabaseSync';
const { mergeHydratedEvents } = require('./eventMerge');

const PROFILE_STORAGE_KEY = '@journalx_profile';
const INSIGHTS_STORAGE_KEY = '@journalx_insights';
const WATER_STORAGE_KEY = '@journalx_water';
const WEIGHT_LOG_STORAGE_KEY = '@journalx_weight_log';

const StoreContext = createContext(null);

const initialState = {
  events: [],
  journal: [],
  summaries: {},
  moodEntries: [],
  insights: [], // { id, date (YYYY-MM-DD), text, createdAt } — newest first
  profile: {
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    weightGoal: '',
    aiContext: '',
    medicalConditions: '',
    calorieGoal: '',
    proteinGoal: '',
    waterGoalOz: '',
  },
  waterEntries: [], // { id, date (YYYY-MM-DD), time (HH:mm), oz, createdAt }
  weightLogs: [], // { id, weight (string, lbs number), date (YYYY-MM-DD), createdAt } — newest first
  loading: false,
};

function storeReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const incomingSummaries = action.payload.summaries;
      let summaries = state.summaries;
      if (incomingSummaries && typeof incomingSummaries === 'object') {
        summaries = { ...state.summaries };
        for (const date of Object.keys(incomingSummaries)) {
          const inc = incomingSummaries[date];
          const cur = state.summaries[date];
          const incUpdated = inc?.updatedAt ?? inc?.createdAt ?? '';
          const curUpdated = cur?.updatedAt ?? cur?.createdAt ?? '';
          if (!cur || (incUpdated && curUpdated && incUpdated > curUpdated)) {
            summaries[date] = inc;
          }
        }
      }
      // The initial load merges any event created while hydration was in
      // flight. A foreground refresh is authoritative: retaining every absent
      // local row would resurrect events deleted by another trusted client and
      // the debounced saver would upload them again.
      const events = mergeHydratedEvents(state.events, action.payload.events, {
        replace: Boolean(action.payload.replaceEvents),
      });

      return {
        ...state,
        events,
        journal: action.payload.journal ?? state.journal,
        summaries,
        moodEntries: action.payload.moodEntries ?? state.moodEntries,
        insights: action.payload.insights ?? state.insights,
        profile: action.payload.profile != null ? { ...state.profile, ...action.payload.profile } : state.profile,
        waterEntries: action.payload.waterEntries ?? state.waterEntries,
        weightLogs: action.payload.weightLogs ?? state.weightLogs,
        loading: false,
      };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_EVENT':
      return { ...state, events: [action.payload, ...state.events] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload.id),
      };
    case 'ADD_JOURNAL_ENTRY':
      return { ...state, journal: [...state.journal, action.payload] };
    case 'UPDATE_JOURNAL_ENTRY':
      return {
        ...state,
        journal: state.journal.map((j) =>
          j.id === action.payload.id ? { ...j, ...action.payload } : j
        ),
      };
    case 'DELETE_JOURNAL_ENTRY':
      return {
        ...state,
        journal: state.journal.filter((j) => j.id !== action.payload.id),
      };
    case 'REPLACE_JOURNAL_FOR_DAY':
      return {
        ...state,
        journal: [
          ...state.journal.filter((j) => j.date !== action.payload.date),
          action.payload.entry,
        ],
      };
    case 'SET_SUMMARY': {
      const { date, text, highlightedWord } = action.payload;
      const existing = state.summaries[date];
      const previousText = existing?.text;
      const now = new Date().toISOString();
      return {
        ...state,
        summaries: {
          ...state.summaries,
          [date]: {
            text,
            highlightedWord: highlightedWord ?? existing?.highlightedWord,
            previousText: previousText ?? existing?.previousText,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          },
        },
      };
    }
    case 'ADD_MOOD':
      return {
        ...state,
        moodEntries: [action.payload, ...state.moodEntries],
      };
    case 'UPDATE_MOOD':
      return {
        ...state,
        moodEntries: state.moodEntries.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload } : m
        ),
      };
    case 'DELETE_MOOD':
      return {
        ...state,
        moodEntries: state.moodEntries.filter((m) => m.id !== action.payload.id),
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
      };
    case 'ADD_WATER_ENTRY':
      return {
        ...state,
        waterEntries: [action.payload, ...state.waterEntries],
      };
    case 'UPDATE_WATER_ENTRY':
      return {
        ...state,
        waterEntries: state.waterEntries.map((w) =>
          w.id === action.payload.id ? { ...w, ...action.payload } : w
        ),
      };
    case 'DELETE_WATER_ENTRY':
      return {
        ...state,
        waterEntries: state.waterEntries.filter((w) => w.id !== action.payload.id),
      };
    case 'ADD_INSIGHTS_ENTRY':
      return {
        ...state,
        insights: [action.payload, ...state.insights],
      };
    case 'ADD_WEIGHT_LOG':
      return {
        ...state,
        weightLogs: [action.payload, ...state.weightLogs],
        profile: { ...state.profile, weight: action.payload.weight },
      };
    default:
      return state;
  }
}

const SAVE_DEBOUNCE_MS = 1500;

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);
  const saveTimeoutRef = useRef(null);
  const savePromiseRef = useRef(null);
  const saveFailedRef = useRef(false);
  const latestStateRef = useRef(state);
  const isInitialMount = useRef(true);
  const profileLoadedRef = useRef(false);
  latestStateRef.current = state;

  const queueStateSave = (snapshot) => {
    const previous = savePromiseRef.current || Promise.resolve(true);
    const request = previous
      .catch(() => false)
      .then(() => saveFullStateToSupabase(snapshot));
    savePromiseRef.current = request;
    void request
      .then(
        (saved) => {
          saveFailedRef.current = saved === false;
        },
        () => {
          saveFailedRef.current = true;
        }
      )
      .finally(() => {
        if (savePromiseRef.current === request) savePromiseRef.current = null;
      })
      .catch(() => {});
    return request;
  };

  const flushPendingStateSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      queueStateSave(latestStateRef.current);
    }
    if (!savePromiseRef.current && saveFailedRef.current) {
      queueStateSave(latestStateRef.current);
    }
    const pending = savePromiseRef.current;
    if (!pending) return true;
    return (await pending) !== false;
  };

  // Meals logged offline get estimated + added once we're back online.
  useEffect(() => startPendingFoodSync(dispatch), []);

  // Load from Supabase, profile, insights, water from AsyncStorage on mount
  useEffect(() => {
    const loadProfileAndInsights = async () => {
      try {
        const [profileRaw, insightsRaw, waterRaw, weightLogRaw] = await Promise.all([
          AsyncStorage.getItem(PROFILE_STORAGE_KEY),
          AsyncStorage.getItem(INSIGHTS_STORAGE_KEY),
          AsyncStorage.getItem(WATER_STORAGE_KEY),
          AsyncStorage.getItem(WEIGHT_LOG_STORAGE_KEY),
        ]);
        const payload = {};
        if (profileRaw) {
          payload.profile = JSON.parse(profileRaw);
        }
        if (insightsRaw) {
          try {
            const list = JSON.parse(insightsRaw);
            payload.insights = Array.isArray(list) ? list : [];
          } catch (_) {
            payload.insights = [];
          }
        }
        if (waterRaw) {
          try {
            const list = JSON.parse(waterRaw);
            payload.waterEntries = Array.isArray(list) ? list : [];
          } catch (_) {
            payload.waterEntries = [];
          }
        }
        if (weightLogRaw) {
          try {
            const list = JSON.parse(weightLogRaw);
            payload.weightLogs = Array.isArray(list) ? list : [];
          } catch (_) {
            payload.weightLogs = [];
          }
        }
        if (Object.keys(payload).length > 0) {
          dispatch({ type: 'HYDRATE', payload });
        }
      } catch (_) {}
      profileLoadedRef.current = true;
    };
    loadProfileAndInsights();

    if (!isSupabaseConfigured()) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    loadFromSupabase()
      .then((data) => {
        if (data) {
          dispatch({ type: 'HYDRATE', payload: data });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      })
      .catch(() => dispatch({ type: 'SET_LOADING', payload: false }));
  }, []);

  // Jarvis and other trusted clients can add rows while LifeSync is in the
  // background. Refresh silently on a real foreground transition so those
  // server-side changes become visible without resetting the current screen.
  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;

    let mounted = true;
    let previousAppState = AppState.currentState;
    let refreshInFlight = null;

    const refreshFromSupabase = () => {
      if (refreshInFlight) return refreshInFlight;

      const request = (async () => {
        // If the user changes anything while the cloud read is running, flush
        // that newer snapshot and read again before applying an authoritative
        // replacement. This keeps an in-flight foreground refresh from
        // discarding a just-created local event.
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const saved = await flushPendingStateSave();
          if (!saved) throw new Error('Pending LifeSync changes could not be saved.');
          const flushedState = latestStateRef.current;
          const data = await loadFromSupabase();
          if (!mounted || !data) return;
          if (latestStateRef.current !== flushedState) continue;
          dispatch({
            type: 'HYDRATE',
            payload: { ...data, replaceEvents: true },
          });
          return;
        }
        if (mounted) {
          console.warn('[Supabase] Foreground refresh deferred because local changes are still arriving.');
        }
      })()
        .catch((error) => {
          console.warn('[Supabase] Foreground refresh failed:', error);
        })
        .finally(() => {
          if (refreshInFlight === request) refreshInFlight = null;
        });

      refreshInFlight = request;
      return request;
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded =
        previousAppState === 'background' || previousAppState === 'inactive';
      previousAppState = nextState;

      if (wasBackgrounded && nextState === 'active') refreshFromSupabase();
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Debounced save to Supabase on state change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isSupabaseConfigured()) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      queueStateSave(state).catch((error) => {
        console.warn('[Supabase] Debounced save failed:', error);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [state.events, state.journal, state.summaries, state.moodEntries, state.profile, state.waterEntries, state.weightLogs]);

  // Save profile to AsyncStorage when it changes (after initial load)
  useEffect(() => {
    if (!profileLoadedRef.current) return;
    AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile)).catch(() => {});
  }, [state.profile]);

  // Save insights to AsyncStorage when they change (after initial load)
  useEffect(() => {
    if (!profileLoadedRef.current) return;
    AsyncStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(state.insights)).catch(() => {});
  }, [state.insights]);

  // Save water entries to AsyncStorage when they change (after initial load)
  useEffect(() => {
    if (!profileLoadedRef.current) return;
    AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(state.waterEntries)).catch(() => {});
  }, [state.waterEntries]);

  // Save weight logs to AsyncStorage when they change (after initial load)
  useEffect(() => {
    if (!profileLoadedRef.current) return;
    AsyncStorage.setItem(WEIGHT_LOG_STORAGE_KEY, JSON.stringify(state.weightLogs)).catch(() => {});
  }, [state.weightLogs]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useEvents(date) {
  const { state } = useStore();
  if (date) {
    return state.events.filter((e) => e.date === date);
  }
  return state.events;
}

export function useJournal(date) {
  const { state } = useStore();
  if (date) {
    return state.journal.filter((j) => j.date === date).sort((a, b) => a.time.localeCompare(b.time));
  }
  return state.journal;
}

export function useSummary(date) {
  const { state } = useStore();
  return state.summaries[date] || null;
}

export function useLatestSummary(today) {
  const { state } = useStore();
  const dates = Object.keys(state.summaries).sort().reverse();
  for (const d of dates) {
    if (d <= today) return state.summaries[d];
  }
  return null;
}

export function useMood(date) {
  const { state } = useStore();
  const entries = state.moodEntries.filter((m) => m.date === date);
  if (entries.length === 0) return null;
  const latest = entries.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  return { emotion: latest.emotion, intensity: latest.intensity };
}

export function useMoodHistory(date) {
  const { state } = useStore();
  return state.moodEntries
    .filter((m) => m.date === date)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Returns up to 3 most recently logged meds with name, dosage, and unit. */
export function useRecentMeds() {
  const { state } = useStore();
  const medEvents = state.events
    .filter((e) => e.type === EVENT_TYPES.meds && e.name)
    .sort((a, b) => {
      const da = `${a.date || ''} ${a.time || ''}`;
      const db = `${b.date || ''} ${b.time || ''}`;
      return db.localeCompare(da);
    });
  const seen = new Set();
  const result = [];
  for (const e of medEvents) {
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    result.push({
      name: e.name,
      dosage: e.dosage ?? 0,
      unit: e.unit ?? 'mg',
    });
    if (result.length >= 3) break;
  }
  return result;
}

export function useRecentEvents(count = 3) {
  const { state } = useStore();
  const seen = new Set();
  const result = [];
  for (const e of state.events) {
    if (seen.has(e.type)) continue;
    seen.add(e.type);
    result.push(e);
    if (result.length >= count) break;
  }
  return result;
}

/** Most recent insights entry (newest first in state.insights). */
export function useLatestInsight() {
  const { state } = useStore();
  return state.insights[0] ?? null;
}

/** Full insights history (newest first). */
export function useInsightsHistory() {
  const { state } = useStore();
  return state.insights;
}

/** Today's total water (oz) from water entries. */
export function useTodayWaterOz() {
  const { state } = useStore();
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  return state.waterEntries
    .filter((w) => w.date === today)
    .reduce((sum, w) => sum + (Number(w.oz) || 0), 0);
}

/** Water entries (newest first). */
export function useWaterEntries() {
  const { state } = useStore();
  return state.waterEntries;
}

/** Weight logs (newest first). */
export function useWeightLogs() {
  const { state } = useStore();
  return state.weightLogs;
}

/** Today's total calories and protein from food events. */
export function useTodayCaloriesAndProtein() {
  const { state } = useStore();
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const foodEvents = state.events.filter((e) => e.type === EVENT_TYPES.food && e.date === today);
  const calories = foodEvents.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
  const protein = foodEvents.reduce((sum, e) => sum + (Number(e.protein) || 0), 0);
  return { calories, protein };
}
