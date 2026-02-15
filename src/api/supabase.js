/**
 * Supabase client for JournalX2.
 *
 * Set these in .env (or app.config.js):
 *   EXPO_PUBLIC_SUPABASE_URL=https://levejzunkzkpevirmbah.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 *
 * Get your anon key from: Supabase Dashboard → Project Settings → API
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  '';
const supabaseAnonKey =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  '';

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
        },
      })
    : null;

export const isSupabaseConfigured = () => !!supabase;
