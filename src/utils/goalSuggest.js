'use strict';

/**
 * Suggest daily nutrition targets from the profile: Mifflin-St Jeor BMR times
 * an activity factor, adjusted for the goal (gain / maintain / lose).
 * CommonJS so scripts/test-nutrition.cjs can load it in plain node.
 */

const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
// kcal on top of maintenance, and protein grams per kg of body weight.
const GOAL_PLANS = {
  gain: { kcal: 400, proteinPerKg: 1.8 },
  maintain: { kcal: 0, proteinPerKg: 1.6 },
  lose: { kcal: -500, proteinPerKg: 2.0 },
};
const SODIUM_MAX_MG = 2300;

function parseNumber(str) {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).replace(/,/g, '').trim();
  const match = s.match(/[\d.]+/);
  // A stray "." parses to NaN; treat it (and 0) as missing.
  return match ? parseFloat(match[0]) || null : null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** Parse weight to kg. The app stores pounds ("154"); "70 kg" also works. */
function weightToKg(weightStr) {
  const n = parseNumber(weightStr);
  if (n == null) return null;
  return String(weightStr).toLowerCase().includes('kg') ? n : n / 2.205;
}

/** Parse height to cm. Supports 5'10", "178 cm", "70" (inches) and "5.9" (feet). */
function heightToCm(heightStr) {
  if (heightStr == null || String(heightStr).trim() === '') return null;
  const s = String(heightStr).trim().toLowerCase();
  // Curly quotes too: iOS Smart Punctuation types 5'10" as 5’10”.
  const ftInMatch = s.match(/^(\d+)\s*['’]\s*(\d+)\s*["'”’]*\s*$/);
  if (ftInMatch) {
    return (parseInt(ftInMatch[1], 10) * 12 + parseInt(ftInMatch[2], 10)) * 2.54;
  }
  const n = parseNumber(heightStr);
  if (n == null) return null;
  if (s.includes('in')) return n * 2.54;
  if (s.includes('cm') || s.includes('m')) return n;
  if (n < 10) return n * 30.48;
  if (n < 100) return n * 2.54;
  return n;
}

/** Mifflin-St Jeor BMR in kcal/day. Unset sex uses the male constant. */
function mifflinStJeor(weightKg, heightCm, age, sex) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
}

/** Carbs, fat, fiber and sugar cap that go with a calorie and protein target. */
function macroSplit(calories, protein) {
  const fat = Math.round((calories * 0.3) / 9);
  return {
    carbs: Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4)),
    fat,
    fiber: clamp(Math.round((calories / 1000) * 14), 25, 45),
    sugarMax: Math.round((calories * 0.1) / 4),
  };
}

/**
 * @param {{ age?: string, height?: string, weight?: string, sex?: string, activity?: string, goalType?: string }} profile
 * @returns {{ calories: number, protein: number, carbs: number, fat: number, fiber: number, sugarMax: number, sodiumMax: number } | { error: string }}
 */
function suggestGoals(profile) {
  const age = parseNumber(profile.age);
  const heightCm = heightToCm(profile.height);
  const weightKg = weightToKg(profile.weight);

  if (weightKg == null || weightKg <= 0) {
    return { error: 'Enter your weight to get suggestions.' };
  }
  if (heightCm == null || heightCm <= 0) {
    return { error: 'Enter your height to get suggestions.' };
  }
  if (age == null || age < 10 || age > 120) {
    return { error: 'Enter your age to get suggestions.' };
  }

  const plan = GOAL_PLANS[profile.goalType] || GOAL_PLANS.gain;
  const factor = ACTIVITY_FACTORS[profile.activity] || ACTIVITY_FACTORS.moderate;
  const maintenance = mifflinStJeor(weightKg, heightCm, age, profile.sex) * factor;
  const calories = clamp(Math.round(maintenance + plan.kcal), 1200, 4500);
  const protein = clamp(Math.round(weightKg * plan.proteinPerKg), 50, 300);
  return { calories, protein, ...macroSplit(calories, protein), sodiumMax: SODIUM_MAX_MG };
}

module.exports = { suggestGoals, macroSplit, SODIUM_MAX_MG };
