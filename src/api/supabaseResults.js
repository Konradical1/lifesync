'use strict';

function assertSupabaseResults(results) {
  for (const [name, result] of Object.entries(results || {})) {
    if (!result?.error) continue;
    const message = result.error.message || `Supabase ${name} query failed`;
    const error = new Error(message);
    error.code = result.error.code || 'supabase_read_failed';
    error.source = name;
    throw error;
  }
}

module.exports = { assertSupabaseResults };
