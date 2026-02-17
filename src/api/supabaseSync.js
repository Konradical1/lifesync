/**
 * Supabase sync service for JournalX2.
 * Loads data on init, saves on changes. Uses anonymous auth for user scoping.
 */
import { supabase, isSupabaseConfigured } from './supabase';

async function ensureSignedIn() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[Supabase] Anonymous sign-in failed:', error.message);
    return null;
  }
  return data?.user?.id ?? null;
}

function eventToRow(e) {
  return {
    id: e.id,
    type: e.type,
    date: e.date,
    time: e.time ?? null,
    start_time: e.startTime ?? null,
    end_time: e.endTime ?? null,
    description: e.description ?? null,
    note: e.note ?? null,
    calories: e.calories ?? null,
    protein: e.protein ?? null,
    carbs: e.carbs ?? null,
    fat: e.fat ?? null,
    duration: e.duration ?? null,
    name: e.name ?? null,
    dosage: e.dosage ?? null,
    unit: e.unit ?? null,
  };
}

function rowToEvent(row) {
  const e = {
    id: row.id,
    type: row.type,
    date: row.date,
  };
  if (row.time) e.time = row.time;
  if (row.start_time) e.startTime = row.start_time;
  if (row.end_time) e.endTime = row.end_time;
  if (row.description) e.description = row.description;
  if (row.note) e.note = row.note;
  if (row.calories != null) e.calories = row.calories;
  if (row.protein != null) e.protein = row.protein;
  if (row.carbs != null) e.carbs = row.carbs;
  if (row.fat != null) e.fat = row.fat;
  if (row.duration != null) e.duration = row.duration;
  if (row.name) e.name = row.name;
  if (row.dosage != null) e.dosage = row.dosage;
  if (row.unit) e.unit = row.unit;
  return e;
}

/**
 * Load all data from Supabase. Returns { events, journal, summaries, moodEntries, profile } or null on error.
 */
export async function loadFromSupabase() {
  const userId = await ensureSignedIn();
  if (!userId) return null;

  try {
    const [eventsRes, journalRes, summariesRes, moodRes, profileRes, waterRes] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('journal_entries').select('*').order('date').order('time'),
      supabase.from('summaries').select('date, text, created_at, updated_at').order('date'),
      supabase.from('mood').select('id, date, time, start_time, end_time, emotion, intensity, created_at').order('created_at', { ascending: false }),
      supabase.from('profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('water').select('id, date, time, oz, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    const events = (eventsRes.data ?? []).map(rowToEvent);
    const journal = (journalRes.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      text: r.text,
    }));
    const summaries = {};
    (summariesRes.data ?? []).forEach((r) => {
      summaries[r.date] = {
        text: r.text,
        createdAt: r.created_at ?? null,
        updatedAt: r.updated_at ?? null,
      };
    });
    const moodEntries = (moodRes.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time ?? null,
      startTime: r.start_time ?? r.time ?? null,
      endTime: r.end_time ?? null,
      emotion: r.emotion,
      intensity: r.intensity,
      createdAt: r.created_at ?? null,
    }));

    let profile = null;
    if (profileRes.data) {
      const p = profileRes.data;
      profile = {
        name: p.name ?? '',
        age: p.age ?? '',
        height: p.height ?? '',
        weight: p.weight ?? '',
        medicalConditions: p.medical_conditions ?? '',
        calorieGoal: p.calorie_goal != null ? String(p.calorie_goal) : '',
        proteinGoal: p.protein_goal != null ? String(p.protein_goal) : '',
        waterGoalOz: p.water_goal_oz != null ? String(p.water_goal_oz) : '',
      };
    }

    const waterEntries = (waterRes.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time ?? null,
      oz: r.oz ?? 0,
      createdAt: r.created_at ?? null,
    }));

    return { events, journal, summaries, moodEntries, profile, waterEntries };
  } catch (err) {
    console.warn('[Supabase] Load failed:', err);
    return null;
  }
}

/**
 * Save events to Supabase (upsert).
 */
export async function saveEventsToSupabase(events) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const rows = events.map((e) => ({
    ...eventToRow(e),
    user_id: userId,
  }));

  const { error } = await supabase.from('events').upsert(rows, {
    onConflict: 'id',
  });
  if (error) {
    console.warn('[Supabase] Save events failed:', error);
    return false;
  }
  return true;
}

/**
 * Save journal entries to Supabase (upsert).
 */
export async function saveJournalToSupabase(journal) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const rows = journal.map((j) => ({
    id: j.id,
    user_id: userId,
    date: j.date,
    time: j.time,
    text: j.text,
  }));

  const { error } = await supabase.from('journal_entries').upsert(rows, {
    onConflict: 'id',
  });
  if (error) {
    console.warn('[Supabase] Save journal failed:', error);
    return false;
  }
  return true;
}

/**
 * Delete a journal entry from Supabase.
 */
export async function deleteJournalEntryFromSupabase(journalId) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', journalId)
    .eq('user_id', userId);
  if (error) {
    console.warn('[Supabase] Delete journal entry failed:', error);
    return false;
  }
  return true;
}

/**
 * Save summaries to Supabase (upsert per date).
 */
export async function saveSummariesToSupabase(summaries) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const entries = Object.entries(summaries).map(([date, entry]) => ({
    user_id: userId,
    date,
    text: typeof entry === 'object' && entry?.text != null ? entry.text : entry,
  }));

  const { error } = await supabase.from('summaries').upsert(entries, {
    onConflict: 'user_id,date',
    ignoreDuplicates: true,
  });
  if (error) {
    console.warn('[Supabase] Save summaries failed:', error);
    return false;
  }
  return true;
}

/**
 * Save mood entries to Supabase. Inserts new entries, skips existing (by id).
 */
export async function saveMoodEntriesToSupabase(moodEntries) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const rows = moodEntries.map((m) => ({
    id: m.id,
    user_id: userId,
    date: m.date,
    time: m.time ?? m.startTime ?? null,
    start_time: m.startTime ?? null,
    end_time: m.endTime ?? null,
    emotion: m.emotion,
    intensity: m.intensity,
  }));

  const { error } = await supabase.from('mood').upsert(rows, {
    onConflict: 'id',
  });
  if (error) {
    console.warn('[Supabase] Save mood entries failed:', error);
    return false;
  }
  return true;
}

/**
 * Delete a mood entry from Supabase.
 */
export async function deleteMoodEntryFromSupabase(moodId) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const { error } = await supabase
    .from('mood')
    .delete()
    .eq('id', moodId)
    .eq('user_id', userId);
  if (error) {
    console.warn('[Supabase] Delete mood failed:', error);
    return false;
  }
  return true;
}

/**
 * Delete an event from Supabase.
 */
export async function deleteEventFromSupabase(eventId) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);
  if (error) {
    console.warn('[Supabase] Delete event failed:', error);
    return false;
  }
  return true;
}

/**
 * Save profile to Supabase (upsert by user_id).
 */
export async function saveProfileToSupabase(profile) {
  const userId = await ensureSignedIn();
  if (!userId || !profile) return false;

  const row = {
    user_id: userId,
    name: profile.name ?? null,
    age: profile.age ?? null,
    height: profile.height ?? null,
    weight: profile.weight ?? null,
    medical_conditions: profile.medicalConditions ?? null,
    calorie_goal: profile.calorieGoal != null && profile.calorieGoal !== '' ? parseInt(profile.calorieGoal, 10) : null,
    protein_goal: profile.proteinGoal != null && profile.proteinGoal !== '' ? parseInt(profile.proteinGoal, 10) : null,
    water_goal_oz: profile.waterGoalOz != null && profile.waterGoalOz !== '' ? parseInt(profile.waterGoalOz, 10) : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profile').upsert(row, {
    onConflict: 'user_id',
  });
  if (error) {
    console.warn('[Supabase] Save profile failed:', error);
    return false;
  }
  return true;
}

/**
 * Save water entries to Supabase (upsert).
 */
export async function saveWaterEntriesToSupabase(waterEntries) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const rows = waterEntries.map((w) => ({
    id: w.id,
    user_id: userId,
    date: w.date,
    time: w.time ?? null,
    oz: Number(w.oz) || 0,
  }));

  const { error } = await supabase.from('water').upsert(rows, {
    onConflict: 'id',
  });
  if (error) {
    console.warn('[Supabase] Save water entries failed:', error);
    return false;
  }
  return true;
}

/**
 * Delete a water entry from Supabase.
 */
export async function deleteWaterEntryFromSupabase(waterId) {
  const userId = await ensureSignedIn();
  if (!userId) return false;

  const { error } = await supabase
    .from('water')
    .delete()
    .eq('id', waterId)
    .eq('user_id', userId);
  if (error) {
    console.warn('[Supabase] Delete water entry failed:', error);
    return false;
  }
  return true;
}

/**
 * Save full state to Supabase. Call after any store change.
 */
export async function saveFullStateToSupabase(state) {
  if (!isSupabaseConfigured()) return;
  await Promise.all([
    saveEventsToSupabase(state.events),
    saveJournalToSupabase(state.journal),
    saveSummariesToSupabase(state.summaries),
    saveMoodEntriesToSupabase(state.moodEntries),
    saveProfileToSupabase(state.profile),
    saveWaterEntriesToSupabase(state.waterEntries),
  ]);
}
