const assert = require('node:assert/strict');
const { mergeHydratedEvents } = require('../src/store/eventMerge');
const { assertSupabaseResults } = require('../src/api/supabaseResults');

const server = [
  { id: 'server-existing', type: 'food' },
  { id: 'jarvis-new', type: 'food', source: 'jarvis' },
];
const current = [
  { id: 'server-existing', type: 'food' },
  { id: 'server-deleted', type: 'exercise' },
];

assert.deepEqual(
  mergeHydratedEvents(current, server, { replace: true }),
  server,
  'a foreground refresh must add Jarvis rows and keep server deletions deleted',
);

assert.doesNotThrow(() => assertSupabaseResults({ events: { data: server, error: null } }));
assert.throws(
  () => assertSupabaseResults({
    events: { data: null, error: { code: 'network', message: 'events unavailable' } },
    water: { data: [], error: null },
  }),
  (error) => error.code === 'network' && error.source === 'events',
  'a partial cloud read must abort authoritative hydration',
);
assert.deepEqual(
  mergeHydratedEvents(current, server),
  [...server, current[1]],
  'initial hydration still preserves an event created while the request was in flight',
);

console.log('LifeSync store merge tests passed');
