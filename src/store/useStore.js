import React, { createContext, useContext, useReducer } from 'react';
import {
  initialMockEvents,
  initialMockJournal,
  getInitialMockSummaries,
  getInitialMockMood,
  EVENT_TYPES,
} from './mockData';

const StoreContext = createContext(null);

const initialState = {
  events: initialMockEvents,
  journal: initialMockJournal,
  summaries: getInitialMockSummaries(),
  mood: getInitialMockMood(),
};

function storeReducer(state, action) {
  switch (action.type) {
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
      return {
        ...state,
        summaries: { ...state.summaries, [action.payload.date]: action.payload.text },
      };
    case 'SET_MOOD':
      return {
        ...state,
        mood: { ...state.mood, [action.payload.date]: action.payload },
      };
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);
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
  return state.mood[date] || null;
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
