/**
 * Expo app config. Loads .env so Supabase (and other) vars are available
 * when building. Values in extra are embedded in the app and available
 * at runtime via Constants.expoConfig.extra (needed for native builds).
 */
require('dotenv').config();

const appJson = require('./app.json');

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo?.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
};
