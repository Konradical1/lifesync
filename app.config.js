/**
 * Expo app config. Loads .env so Supabase (and other) vars are available
 * when building. Values in extra are embedded in the app and available
 * at runtime via Constants.expoConfig.extra (needed for native builds).
 *
 * Google Sign-In: set these in .env once you create OAuth clients
 * (see DEPLOYMENT.md):
 *   GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
 *   GOOGLE_IOS_CLIENT_ID=yyyy.apps.googleusercontent.com
 *   GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.yyyy
 * The Google Sign-In native plugin is only included when
 * GOOGLE_IOS_URL_SCHEME is set, so builds keep working before setup.
 *
 * App icon: drop a 1024x1024 PNG (no transparency) at assets/icon.png
 * and it will be used automatically instead of the legacy JPG.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const pngIcon = './assets/icon.png';
const hasPngIcon = fs.existsSync(path.join(__dirname, 'assets', 'icon.png'));

module.exports = ({ config }) => {
  const icon = hasPngIcon ? pngIcon : config.icon;
  const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME || '';
  const plugins = [...(config.plugins || [])];

  if (googleIosUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleIosUrlScheme },
    ]);
    plugins.push('./plugins/withIosModularHeaders');
  }

  return {
    ...config,
    owner: 'konradical1',
    icon,
    ios: {
      ...config.ios,
      icon,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        foregroundImage: icon,
      },
    },
    plugins,
    extra: {
      ...config.extra,
      eas: { projectId: 'e2f2eda3-cdc4-47ff-b156-a0d2675629d0' },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
    },
  };
};
