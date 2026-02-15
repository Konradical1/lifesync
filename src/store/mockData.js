// Mock data for Journal X — local state only

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const EVENT_TYPES = {
  sleep: 'sleep',
  food: 'food',
  exercise: 'exercise',
  meds: 'meds',
  other: 'other',
};

export const EVENT_ICON_NAMES = {
  sleep: 'moon-outline',
  food: 'restaurant-outline',
  exercise: 'fitness-outline',
  meds: 'medkit-outline',
  other: 'document-text-outline',
};

export const EVENT_LABELS = {
  sleep: 'Sleep',
  food: 'Food',
  exercise: 'Exercise',
  meds: 'Meds',
  other: 'Other',
};

export const initialMockEvents = [
  {
    id: '1',
    type: EVENT_TYPES.sleep,
    date: today(),
    startTime: '23:00',
    endTime: '07:00',
  },
  {
    id: '2',
    type: EVENT_TYPES.food,
    date: today(),
    time: '08:30',
    description: 'Oatmeal with banana',
    calories: 320,
    protein: 12,
    carbs: 58,
  },
  {
    id: '3',
    type: EVENT_TYPES.exercise,
    date: today(),
    time: '10:00',
    description: '30 min run',
    duration: 30,
    calories: 280,
  },
  {
    id: '4',
    type: EVENT_TYPES.meds,
    date: today(),
    time: '09:00',
    name: 'Vitamin D',
    dosage: 1000,
    unit: 'mg',
  },
  {
    id: '5',
    type: EVENT_TYPES.other,
    date: today(),
    time: '14:00',
    note: 'Team meeting',
  },
  {
    id: '9',
    type: EVENT_TYPES.other,
    date: today(),
    time: '09:15',
    note: 'Coffee with Sarah',
  },
  {
    id: '6',
    type: EVENT_TYPES.food,
    date: yesterday(),
    time: '12:30',
    description: 'Grilled chicken salad',
    calories: 420,
    protein: 35,
    carbs: 12,
  },
  {
    id: '7',
    type: EVENT_TYPES.exercise,
    date: yesterday(),
    time: '18:00',
    description: 'Yoga',
    duration: 45,
    calories: 180,
  },
  {
    id: '8',
    type: EVENT_TYPES.meds,
    date: yesterday(),
    time: '08:00',
    name: 'Multivitamin',
    dosage: 1,
    unit: 'tab',
  },
];

export const initialMockJournal = [
  { id: 'j1', date: today(), time: '09:00', text: 'Started the day feeling refreshed.' },
];

export function getInitialMockSummaries() {
  return {
    [today()]: 'You had a balanced day: good sleep, a healthy breakfast, a morning run, and took your supplements. Feeling on track.',
    [yesterday()]: 'Yesterday you focused on recovery with yoga and a light salad. Rest day well spent.',
  };
}

export function getInitialMockMood() {
  return {
    [today()]: { emotion: 'calm', intensity: 3 },
    [yesterday()]: { emotion: 'energized', intensity: 4 },
  };
}

export const MOOD_OPTIONS = [
  { id: 'calm', label: 'Calm' },
  { id: 'energized', label: 'Energized' },
  { id: 'tired', label: 'Tired' },
  { id: 'happy', label: 'Happy' },
  { id: 'focused', label: 'Focused' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'neutral', label: 'Neutral' },
];
