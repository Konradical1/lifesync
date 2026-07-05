import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  useAuth,
  isAppleAuthSupported,
  isGoogleAuthSupported,
} from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { fonts } from "../../theme/ios";

const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = BUTTON_HEIGHT / 2;

let AppleAuthentication = null;
try {
  AppleAuthentication = require("expo-apple-authentication");
} catch {
  AppleAuthentication = null;
}

/**
 * "Continue with Apple / Google" buttons shared by the sign-in and
 * create-account screens. Each button hides itself when its provider
 * isn't available (no native module yet, or Google not configured),
 * so the whole block renders nothing in unconfigured dev builds.
 */
export default function SocialAuthButtons({ onError, disabled }) {
  const { palette, text, scheme } = useTheme();
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [pendingProvider, setPendingProvider] = useState(null);

  const googleAvailable = isGoogleAuthSupported();

  useEffect(() => {
    let mounted = true;
    if (!isAppleAuthSupported() || !AppleAuthentication) return undefined;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setAppleAvailable(available);
      })
      .catch(() => {
        if (mounted) setAppleAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!appleAvailable && !googleAvailable) return null;

  const busy = disabled || pendingProvider !== null;

  async function run(provider, signInFn) {
    onError?.("");
    setPendingProvider(provider);
    try {
      await signInFn();
    } catch (e) {
      if (!e?.isCancelled) {
        onError?.(e?.message || `Could not sign in with ${provider}.`);
      }
    } finally {
      setPendingProvider(null);
    }
  }

  const isDark = scheme === "dark";

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: palette.fill }]} />
        <Text style={[text.footnote, styles.dividerLabel]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: palette.fill }]} />
      </View>

      {appleAvailable && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          onPress={() => run("Apple", signInWithApple)}
          disabled={busy}
          style={[
            styles.button,
            { backgroundColor: isDark ? "#FFFFFF" : "#000000" },
            busy && styles.buttonDisabled,
          ]}
        >
          {pendingProvider === "Apple" ? (
            <ActivityIndicator color={isDark ? "#000000" : "#FFFFFF"} />
          ) : (
            <Text
              style={[
                text.subheadline,
                styles.buttonLabel,
                { color: isDark ? "#000000" : "#FFFFFF" },
              ]}
            >
               Continue with Apple
            </Text>
          )}
        </Pressable>
      )}

      {googleAvailable && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          onPress={() => run("Google", signInWithGoogle)}
          disabled={busy}
          style={[
            styles.button,
            { backgroundColor: palette.fill },
            busy && styles.buttonDisabled,
          ]}
        >
          {pendingProvider === "Google" ? (
            <ActivityIndicator color={palette.label} />
          ) : (
            <Text
              style={[
                text.subheadline,
                styles.buttonLabel,
                { color: palette.label },
              ]}
            >
              Continue with Google
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  dividerLabel: {
    marginHorizontal: 12,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    fontFamily: fonts.bodyMedium,
  },
});
