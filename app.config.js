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
    owner: 'konradical1',
    extra: {
      ...appJson.expo?.extra,
      eas: { projectId: 'e2f2eda3-cdc4-47ff-b156-a0d2675629d0' },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
};
