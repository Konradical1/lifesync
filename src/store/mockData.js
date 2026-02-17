// Event types, labels, and app constants (no mock data — data loads from database)

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

export function generateMoodId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return c === 'x' ? r.toString(16) : ((r & 0x3) | 0x8).toString(16);
  });
}

export const MOOD_OPTIONS = [
  { id: 'calm', label: 'Calm', color: '#60A5FA' },
  { id: 'energized', label: 'Energized', color: '#FBBF24' },
  { id: 'tired', label: 'Tired', color: '#94A3B8' },
  { id: 'happy', label: 'Happy', color: '#34D399' },
  { id: 'focused', label: 'Focused', color: '#6366F1' },
  { id: 'anxious', label: 'Anxious', color: '#F87171' },
  { id: 'neutral', label: 'Neutral', color: '#9CA3AF' },
  { id: 'angry', label: 'Angry', color: '#EF4444' },
  { id: 'sad', label: 'Sad', color: '#64748B' },
];
