import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "../api/supabase";

const AuthContext = createContext(null);
const LOCAL_AUTH_KEY = "@journalx_local_auth_bypass";
const LOCAL_USER = {
  id: "local-dev-user",
  email: "local-preview@journalx.dev",
  isLocalBypass: true,
  user_metadata: {
    display_name: "Local Preview",
  },
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const localBypassRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      const localBypass = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
      if (!mounted) return;

      if (localBypass === "true") {
        localBypassRef.current = true;
        setSession({ user: LOCAL_USER, isLocalBypass: true });
        setUser(LOCAL_USER);
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured() || !supabase) {
        setLoading(false);
        return;
      }

      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      });
    }

    loadAuth();

    if (!isSupabaseConfigured() || !supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (localBypassRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    if (!supabase) {
      throw new Error(
        "App is not configured for cloud sync. Please set Supabase URL and key in your environment.",
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, username) {
    if (!supabase) {
      throw new Error(
        "App is not configured for cloud sync. Please set Supabase URL and key in your environment.",
      );
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: username.trim() },
      },
    });
    if (error) throw error;
    return data;
  }

  async function skipAuthForLocalPreview() {
    await AsyncStorage.setItem(LOCAL_AUTH_KEY, "true");
    localBypassRef.current = true;
    setSession({ user: LOCAL_USER, isLocalBypass: true });
    setUser(LOCAL_USER);
  }

  async function signOut() {
    await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
    localBypassRef.current = false;
    setSession(null);
    setUser(null);
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        skipAuthForLocalPreview,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
