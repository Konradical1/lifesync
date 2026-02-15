/**
 * Suggest daily calorie and protein goals from profile (age, height, weight).
 * Uses Mifflin-St Jeor BMR and a moderate activity factor; protein at 1.6 g/kg.
 */

function parseNumber(str) {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).replace(/,/g, '').trim();
  const match = s.match(/[\d.]+/);
  return match ? parseFloat(match[0], 10) : null;
}

/** Parse weight string to kg. Supports "70", "70 kg", "154 lbs". */
function weightToKg(weightStr) {
  const n = parseNumber(weightStr);
  if (n == null) return null;
  const lower = String(weightStr).toLowerCase();
  if (lower.includes('lb')) return n / 2.205;
  return n;
}

/** Parse height string to cm. Supports "178", "178 cm", "5'10\"", "70" (inches). */
function heightToCm(heightStr) {
  if (heightStr == null || String(heightStr).trim() === '') return null;
  const s = String(heightStr).trim().toLowerCase();
  const ftInMatch = s.match(/^(\d+)\s*'?\s*(\d+)\s*"?\s*$/);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = parseInt(ftInMatch[2], 10);
    return (feet * 12 + inches) * 2.54;
  }
  const n = parseNumber(heightStr);
  if (n == null) return null;
  if (s.includes('in')) return n * 2.54;
  if (s.includes('cm') || s.includes('m')) return n;
  if (n < 10) return n * 30.48;
  return n;
}

/**
 * Mifflin-St Jeor BMR. sex not in profile so we use average of M/F or assume 'm'.
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age
 * @param {'m'|'f'} sex
 */
function mifflinStJeor(weightKg, heightCm, age, sex = 'm') {
  if (sex === 'f') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

/**
 * @param {{ age?: string, height?: string, weight?: string }} profile
 * @returns {{ calorieGoal: number, proteinGoal: number } | { error: string }}
 */
export function suggestGoals(profile) {
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

  const bmr = mifflinStJeor(weightKg, heightCm, age, 'm');
  const activityFactor = 1.55;
  const calorieGoal = Math.round(bmr * activityFactor);
  const proteinGoal = Math.round(weightKg * 1.6);

  return {
    calorieGoal: Math.max(1200, Math.min(4000, calorieGoal)),
    proteinGoal: Math.max(50, Math.min(300, proteinGoal)),
  };
}
