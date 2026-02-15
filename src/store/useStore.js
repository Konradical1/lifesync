import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import {
  initialMockEvents,
  initialMockJournal,
  getInitialMockSummaries,
  getInitialMockMoodEntries,
  EVENT_TYPES,
} from './mockData';
import { isSupabaseConfigured } from '../api/supabase';
import { loadFromSupabase, saveFullStateToSupabase } from '../api/supabaseSync';

const StoreContext = createContext(null);

const initialState = {
  events: initialMockEvents,
  journal: initialMockJournal,
  summaries: getInitialMockSummaries(),
  moodEntries: getInitialMockMoodEntries(),
  loading: false,
};

function storeReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        events: action.payload.events ?? state.events,
        journal: action.payload.journal ?? state.journal,
        summaries: action.payload.summaries ?? state.summaries,
        moodEntries: action.payload.moodEntries ?? state.moodEntries,
        loading: false,
      };
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
    case 'REPLACE_JOURNAL_FOR_DAY':
      return {
        ...state,
        journal: [
          ...state.journal.filter((j) => j.date !== action.payload.date),
          action.payload.entry,
        ],
      };
    case 'SET_SUMMARY':
      if (state.summaries[action.payload.date]) return state;
      return {
        ...state,
        summaries: {
          ...state.summaries,
          [action.payload.date]: {
            text: action.payload.text,
            createdAt: action.payload.createdAt ?? new Date().toISOString(),
            updatedAt: action.payload.updatedAt ?? new Date().toISOString(),
          },
        },
      };
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
    default:
      return state;
  }
}

const SAVE_DEBOUNCE_MS = 1500;

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // Load from Supabase on mount
  useEffect(() => {
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

  // Debounced save to Supabase on state change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isSupabaseConfigured()) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveFullStateToSupabase(state);
      saveTimeoutRef.current = null;
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state.events, state.journal, state.summaries, state.moodEntries]);

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

export function useRecentMeds() {
  const { state } = useStore();
  const meds = state.events
    .filter((e) => e.type === EVENT_TYPES.meds && e.name)
    .map((e) => e.name);
  return [...new Set(meds)].slice(0, 3);
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
