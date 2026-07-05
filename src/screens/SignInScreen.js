import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../store/AuthContext";
import { useTheme } from "../store/ThemeContext";
import { fonts } from "../theme/ios";
import SocialAuthButtons from "../components/Auth/SocialAuthButtons";

const SCREEN_MARGIN = 24;
const HERO_TOP_OFFSET = 60;
const INPUT_HEIGHT = 48;
const INPUT_RADIUS = 14;
const CTA_HEIGHT = 48;

export default function SignInScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { palette, text, shape } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + HERO_TOP_OFFSET,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Text style={text.display} accessibilityRole="header">
          welcome back.
        </Text>
        <Text style={[text.footnote, styles.subtitle]}>
          Sign in to pick up your journal where you left off.
        </Text>

        {!!error && (
          <Text
            style={[text.footnote, styles.error, { color: palette.red }]}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}

        <View style={styles.inputGroup}>
          <Text style={[text.eyebrow, styles.label]}>
            {"Email".toUpperCase()}
          </Text>
          <TextInput
            style={[
              text.body,
              styles.input,
              { backgroundColor: palette.fill, borderCurve: shape.borderCurve },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={palette.tertiaryLabel}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[text.eyebrow, styles.label]}>
            {"Password".toUpperCase()}
          </Text>
          <TextInput
            style={[
              text.body,
              styles.input,
              { backgroundColor: palette.fill, borderCurve: shape.borderCurve },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={palette.tertiaryLabel}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={handleSignIn}
          disabled={loading}
          style={[
            styles.button,
            { backgroundColor: palette.label },
            loading && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={palette.background} />
          ) : (
            <Text style={[text.subheadline, { color: palette.background }]}>
              Sign In
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={loading}
          style={[styles.linkButton, loading && styles.buttonDisabled]}
        >
          <Text style={[text.subheadline, { color: palette.tint }]}>
            Forgot password?
          </Text>
        </Pressable>

        <SocialAuthButtons onError={setError} disabled={loading} />

        <View style={styles.footer}>
          <Text style={text.footnote}>Don't have an account? </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("CreateAccount")}
          >
            <Text
              style={[text.footnote, styles.footerLink, { color: palette.tint }]}
            >
              Create one
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: SCREEN_MARGIN,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 36,
  },
  error: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    height: INPUT_HEIGHT,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
  },
  button: {
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 16,
  },
  footerLink: {
    fontFamily: fonts.bodyMedium,
  },
});
