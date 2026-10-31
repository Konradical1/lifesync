const assert = require('node:assert/strict');
const { suggestGoals } = require('../src/utils/goalSuggest');
const { foodFields, dayTotals, dailyTargets, dayGrade, gapLine } = require('../src/utils/nutrition');

// Targets. The app stores weight in pounds: 154 lb = 69.8 kg, 5'10" = 177.8 cm.
const me = { weight: '154', height: `5'10"`, age: '25', sex: 'male', activity: 'moderate', goalType: 'gain' };
assert.deepEqual(suggestGoals(me), {
  calories: 3019, protein: 126, carbs: 402, fat: 101, fiber: 42, sugarMax: 75, sodiumMax: 2300,
});
assert.equal(suggestGoals({ ...me, height: '70' }).calories, 3019, 'bare height "70" is inches');
assert.equal(suggestGoals({ ...me, height: '178' }).calories, 3021, 'bare height "178" is cm');
assert.equal(suggestGoals({ ...me, height: '5’10”' }).calories, 3019, 'iOS smart quotes still read as feet and inches');
assert.equal(suggestGoals({ ...me, goalType: 'lose' }).calories, 3019 - 900, 'lose = maintenance - 500, gain = +400');
assert.equal(suggestGoals({ ...me, goalType: 'lose' }).protein, 140, 'lose = 2.0 g/kg protein');
assert.equal(suggestGoals({ ...me, goalType: 'maintain' }).protein, 112, 'maintain = 1.6 g/kg protein');
assert.ok(suggestGoals({ ...me, weight: '' }).error);
assert.ok(suggestGoals({ ...me, age: '.' }).error, 'a stray "." is not a number');
assert.deepEqual(dailyTargets({}), {
  calories: 2000, protein: 120, carbs: 229, fat: 67, fiber: 28, sugarMax: 50, sodiumMax: 2300,
});
const saved = dailyTargets({ ...me, calorieGoal: '3200', fiberGoal: '40' });
assert.equal(saved.calories, 3200, 'a saved goal overrides the suggestion');
assert.equal(saved.fiber, 40);
assert.equal(saved.protein, 126, 'unsaved goals still come from the suggestion');
assert.equal(saved.fat, 107, 'fat is 30% of the saved calories');

// Event fields from an API result.
const bigMac = foodFields({
  is_food: true, name: " McDonald's Big Mac ", portion: '1 burger (219 g)', source: 'brand',
  items: [{ name: 'Big Mac', portion: '1 burger', calories: 590 }],
  calories: 590, protein: 25, carbs: 46, fat: 34, fiber: 3, sugar: 9, sodium: 1050, health_score: 4,
  feedback: 'Add a side salad for fiber.',
});
assert.deepEqual(bigMac, {
  description: "McDonald's Big Mac", note: '1 burger (219 g)', calories: 590, protein: 25, carbs: 46, fat: 34,
  nutrition: {
    fiber: 3, sugar: 9, sodium: 1050, health_score: 4, feedback: 'Add a side salad for fiber.',
    items: [{ name: 'Big Mac', portion: '1 burger', calories: 590 }], source: 'brand',
  },
});
const old = foodFields({ name: 'Toast', portion: '', calories: -5, protein: '7.6', health_score: 14 });
assert.equal(old.note, undefined);
assert.equal(old.calories, 0, 'negative numbers become 0');
assert.equal(old.protein, 8);
assert.equal(old.nutrition.health_score, 10, 'health score is clamped to 1-10');
assert.equal(foodFields({ name: 'x' }).nutrition.health_score, null);
assert.equal(foodFields({ name: 'x', health_score: null }).nutrition.health_score, null, 'null is no score, not 1/10');
assert.deepEqual(dayTotals([bigMac, { calories: 100, protein: 5 }]), {
  calories: 690, protein: 30, carbs: 46, fat: 34, fiber: 3, sugar: 9, sodium: 1050,
});

// Day grade.
const targets = dailyTargets(me);
const meal = (calories, protein, fiber, sugar, health_score) => ({ calories, protein, nutrition: { fiber, sugar, health_score } });
const junk = [
  meal(390, 11, 0, 50, 3), meal(390, 11, 0, 50, 3), meal(390, 11, 0, 50, 3), // pumpkin spice lattes
  ...Array(5).fill(meal(340, 5, 0, 41, 2)), // ice cream
];
assert.ok(Math.abs(dayTotals(junk).calories - targets.calories) < 200, 'junk day sits at the calorie goal');
assert.match(dayGrade(junk, targets, { goal: 'gain', hour: 21 }).letter, /^[DF]$/, 'coffee and ice cream at goal grades D or F');
const balanced = [
  meal(650, 35, 10, 12, 9), meal(850, 40, 12, 10, 8), meal(400, 20, 6, 15, 7), meal(1100, 35, 15, 20, 8),
];
assert.equal(dayGrade(balanced, targets, { goal: 'gain', hour: 21 }).letter, 'A', 'a balanced day grades A');
assert.equal(dayGrade(balanced.slice(0, 2), targets, { goal: 'gain', hour: 13 }).letter, 'A', 'lunchtime is paced, not an F');
assert.equal(dayGrade([], targets, { hour: 12 }), null);
assert.equal(dayGrade([{ calories: 600, protein: 40 }], targets, { hour: 12 }).letter.length, 1, 'meals without a health score still grade');
assert.equal(dayGrade(junk, targets, { goal: 'gain', hour: 21 }).reason, 'Mostly processed or sugary food');

// What-to-eat-next gap line.
assert.equal(
  gapLine({ calories: 1900, protein: 80, fiber: 24 }, { calories: 2800, protein: 140, fiber: 39 }),
  '~60 g protein · 15 g fiber · 900 kcal to go',
);
assert.equal(gapLine({ calories: 3000, protein: 150, fiber: 40 }, { calories: 2800, protein: 140, fiber: 39 }), null);

console.log('LifeSync nutrition tests passed');
