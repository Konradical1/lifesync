'use strict';

/**
 * Pure food math shared by the queue, meal detail and Today card. CommonJS so
 * scripts/test-nutrition.cjs can load it in plain node.
 */
const { suggestGoals, macroSplit, SODIUM_MAX_MG } = require('./goalSuggest');

const DEFAULT_CALORIES = 2000;
const DEFAULT_PROTEIN = 120;
const SOURCES = ['label', 'brand', 'estimate'];
const GRADE_WEIGHTS = { quality: 0.3, protein: 0.25, calories: 0.2, fiber: 0.15, sugar: 0.1 };
const GRADE_REASONS = {
  quality: 'Mostly processed or sugary food',
  protein: 'Protein is behind',
  under: 'Calories are behind',
  over: 'Over your calorie target',
  fiber: 'Low on fiber: add fruit, veg, beans or whole grains',
  sugar: 'Sugar is over your cap',
};

function int(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Food event fields from a food-photo API result (name -> description, portion -> note). */
function foodFields(d) {
  const score = int(d?.health_score); // 0 = no score (missing, null or junk)
  return {
    description: typeof d?.name === 'string' ? d.name.trim() : '',
    note: typeof d?.portion === 'string' && d.portion.trim() ? d.portion.trim() : undefined,
    calories: int(d?.calories),
    protein: int(d?.protein),
    carbs: int(d?.carbs),
    fat: int(d?.fat),
    nutrition: {
      fiber: int(d?.fiber),
      sugar: int(d?.sugar),
      sodium: int(d?.sodium),
      health_score: score ? Math.min(10, score) : null,
      feedback: typeof d?.feedback === 'string' ? d.feedback.trim() : '',
      items: Array.isArray(d?.items)
        ? d.items.map((i) => ({ name: String(i?.name ?? ''), portion: String(i?.portion ?? ''), calories: int(i?.calories) }))
        : [],
      source: SOURCES.includes(d?.source) ? d.source : 'estimate',
    },
  };
}

/** Summed kcal, protein/carbs/fat/fiber/sugar (g) and sodium (mg) of food events. */
function dayTotals(meals) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const m of meals) {
    for (const k of ['calories', 'protein', 'carbs', 'fat']) t[k] += Number(m[k]) || 0;
    for (const k of ['fiber', 'sugar', 'sodium']) t[k] += Number(m.nutrition?.[k]) || 0;
  }
  return t;
}

/** Today's targets: goals saved on the profile win; the rest come from suggestGoals, else 2000 kcal defaults. */
function dailyTargets(profile = {}) {
  const suggested = suggestGoals(profile);
  const saved = (key) => parseInt(profile[key], 10) || 0;
  const calories = saved('calorieGoal') || suggested.calories || DEFAULT_CALORIES;
  const protein = saved('proteinGoal') || suggested.protein || DEFAULT_PROTEIN;
  const split = macroSplit(calories, protein);
  return {
    calories,
    protein,
    carbs: saved('carbGoal') || split.carbs,
    fat: saved('fatGoal') || split.fat,
    fiber: saved('fiberGoal') || split.fiber,
    sugarMax: split.sugarMax,
    sodiumMax: SODIUM_MAX_MG,
  };
}

/**
 * A-F grade for the day so far, or null with no meals. Targets are paced by the
 * local hour so a lunchtime grade doesn't count dinner as missing.
 * @returns {{ letter: string, score: number, reason: string } | null}
 */
function dayGrade(meals, targets, { goal = 'gain', hour = 24 } = {}) {
  if (!meals.length) return null;
  const t = dayTotals(meals);
  const pace = Math.min(1, Math.max(0.25, (hour - 7) / 13));
  const upTo = (value, target) => (target > 0 ? Math.min(1, value / (target * pace)) * 100 : 100);

  let scoreKcal = 0;
  let kcal = 0;
  for (const m of meals) {
    const s = m.nutrition?.health_score;
    const c = Number(m.calories) || 0;
    if (s && c > 0) {
      scoreKcal += s * c;
      kcal += c;
    }
  }
  const ratio = targets.calories > 0 ? t.calories / (targets.calories * pace) : 1;
  const under = Math.min(1, ratio) * 100;
  const over = ratio <= 1 ? 100 : Math.max(0, (1.5 - ratio) / 0.5) * 100;
  const parts = {
    quality: kcal > 0 ? (scoreKcal / kcal) * 10 : null,
    protein: upTo(t.protein, targets.protein),
    calories: goal === 'lose' ? over : goal === 'maintain' ? Math.min(under, over) : under,
    fiber: upTo(t.fiber, targets.fiber),
    sugar: t.sugar <= targets.sugarMax ? 100 : Math.max(0, 2 - t.sugar / targets.sugarMax) * 100,
  };

  let sum = 0;
  let weight = 0;
  let worst = null;
  for (const [key, value] of Object.entries(parts)) {
    if (value == null) continue;
    sum += GRADE_WEIGHTS[key] * value;
    weight += GRADE_WEIGHTS[key];
    const loss = GRADE_WEIGHTS[key] * (100 - value);
    if (loss > 0 && (!worst || loss > worst.loss)) worst = { key, loss };
  }
  const score = Math.round(sum / weight);
  const letter = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  let reason = 'On track, nice balance';
  if (score < 85 && worst) {
    reason = worst.key === 'calories' ? GRADE_REASONS[under < over ? 'under' : 'over'] : GRADE_REASONS[worst.key];
  }
  return { letter, score, reason };
}

/** "~60 g protein · 15 g fiber · 900 kcal to go", or null once those are met. */
function gapLine(totals, targets) {
  const protein = targets.protein - totals.protein;
  const fiber = targets.fiber - totals.fiber;
  const kcal = targets.calories - totals.calories;
  const parts = [];
  if (protein >= 5) parts.push(`${Math.round(protein / 5) * 5} g protein`);
  if (fiber >= 3) parts.push(`${Math.round(fiber)} g fiber`);
  if (kcal >= 100) parts.push(`${Math.round(kcal / 50) * 50} kcal`);
  return parts.length ? `~${parts.join(' · ')} to go` : null;
}

/** Palette key for a 1-10 health score: green 7+, orange 4-6, red 1-3, null without a score. */
function healthTone(score) {
  if (!score) return null;
  return score >= 7 ? 'green' : score >= 4 ? 'orange' : 'red';
}

module.exports = { foodFields, dayTotals, dailyTargets, dayGrade, gapLine, healthTone };
