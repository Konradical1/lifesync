import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { supabase, isSupabaseConfigured } from "../api/supabase";

const AuthContext = createContext(null);

// Removed local-preview bypass; clear the stale flag so old installs
// don't get stuck outside the real auth flow.
const LEGACY_LOCAL_AUTH_KEY = "@journalx_local_auth_bypass";

const extra = Constants.expoConfig?.extra ?? {};
const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || "";
const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || "";

const NOT_CONFIGURED_MESSAGE =
  "App is not configured for cloud sync. Please set Supabase URL and key in your environment.";

let isGoogleConfigured = false;

/**
 * Native auth modules are required lazily so the JS bundle still runs on
 * dev builds created before these native modules were added. Once a new
 * native build is made, they resolve normally.
 */
function requireAppleAuth() {
  try {
    return require("expo-apple-authentication");
  } catch {
    return null;
  }
}

function requireGoogleSignin() {
  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

export const isAppleAuthSupported = () =>
  Platform.OS === "ios" && !!requireAppleAuth();

export const isGoogleAuthSupported = () =>
  !!GOOGLE_WEB_CLIENT_ID && !!requireGoogleSignin();

function cancelledError(message) {
  const err = new Error(message);
  err.isCancelled = true;
  return err;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.removeItem(LEGACY_LOCAL_AUTH_KEY).catch(() => {});

    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function requireSupabase() {
    if (!supabase) {
      throw new Error(NOT_CONFIGURED_MESSAGE);
    }
    return supabase;
  }

  async function signIn(email, password) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, username) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: username.trim() },
      },
    });
    if (error) throw error;
    return data;
  }

  async function signInWithApple() {
    const client = requireSupabase();
    const AppleAuthentication = requireAppleAuth();
    if (!AppleAuthentication) {
      throw new Error("Apple Sign-In requires an updated app build.");
    }

    let credential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (e) {
      if (e?.code === "ERR_REQUEST_CANCELED") {
        throw cancelledError("Apple sign-in was cancelled.");
      }
      throw e;
    }

    if (!credential?.identityToken) {
      throw new Error("Apple did not return a sign-in credential.");
    }

    const { data, error } = await client.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;

    // Apple only shares the name on the very first authorization,
    // so persist it to user metadata while we have it.
    const fullName = [
      credential.fullName?.givenName,
      credential.fullName?.familyName,
    ]
      .filter(Boolean)
      .join(" ");
    if (fullName && !data.user?.user_metadata?.display_name) {
      await client.auth
        .updateUser({ data: { display_name: fullName } })
        .catch(() => {});
    }

    return data;
  }

  async function signInWithGoogle() {
    const client = requireSupabase();
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error("Google Sign-In is not configured yet.");
    }
    const googleModule = requireGoogleSignin();
    if (!googleModule) {
      throw new Error("Google Sign-In requires an updated app build.");
    }

    const { GoogleSignin, statusCodes } = googleModule;
    if (!isGoogleConfigured) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      });
      isGoogleConfigured = true;
    }

    let idToken;
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const result = await GoogleSignin.signIn();
      if (result?.type === "cancelled") {
        throw cancelledError("Google sign-in was cancelled.");
      }
      idToken = result?.data?.idToken ?? result?.idToken;
    } catch (e) {
      if (e?.isCancelled || e?.code === statusCodes?.SIGN_IN_CANCELLED) {
        throw cancelledError("Google sign-in was cancelled.");
      }
      throw e;
    }

    if (!idToken) {
      throw new Error("Google did not return a sign-in credential.");
    }

    const { data, error } = await client.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw error;
    return data;
  }

  async function sendPasswordReset(email) {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  }

  async function confirmPasswordReset(email, code, newPassword) {
    const client = requireSupabase();
    const { error } = await client.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    if (error) throw error;
    const { error: updateError } = await client.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;
  }

  async function deleteAccount() {
    const client = requireSupabase();
    const {
      data: { session: current },
    } = await client.auth.getSession();
    if (!current) {
      throw new Error("You must be signed in to delete your account.");
    }
    const { error } = await client.functions.invoke("delete-account");
    if (error) {
      throw new Error("Could not delete your account. Please try again.");
    }
    await client.auth.signOut().catch(() => {});
    setSession(null);
    setUser(null);
  }

  async function signOut() {
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
        signInWithApple,
        signInWithGoogle,
        sendPasswordReset,
        confirmPasswordReset,
        deleteAccount,
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
