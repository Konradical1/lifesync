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

const SCREEN_MARGIN = 24;
const HERO_TOP_OFFSET = 60;
const INPUT_HEIGHT = 48;
const INPUT_RADIUS = 14;
const CTA_HEIGHT = 48;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Two-step in-app password reset:
 * 1. Send a recovery code to the account email.
 * 2. Verify the code and set a new password.
 * Requires the Supabase "Reset Password" email template to include
 * the {{ .Token }} code (see DEPLOYMENT.md).
 */
export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { palette, text, shape } = useTheme();
  const { sendPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setStep("code");
    } catch (e) {
      setError(e.message || "Could not send the reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!code || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await confirmPasswordReset(email, code, password);
      // Verification signs the user in, so the auth gate takes over from here.
    } catch (e) {
      setError(e.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  }

  const isEmailStep = step === "email";

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
          reset password.
        </Text>
        <Text style={[text.footnote, styles.subtitle]}>
          {isEmailStep
            ? "Enter your email and we'll send you a reset code."
            : `We sent a code to ${email}. Enter it below with your new password.`}
        </Text>

        {!!error && (
          <Text
            style={[text.footnote, styles.error, { color: palette.red }]}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}

        {isEmailStep ? (
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
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={[text.eyebrow, styles.label]}>
                {"Reset code".toUpperCase()}
              </Text>
              <TextInput
                style={[
                  text.body,
                  styles.input,
                  { backgroundColor: palette.fill, borderCurve: shape.borderCurve },
                ]}
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColor={palette.tertiaryLabel}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[text.eyebrow, styles.label]}>
                {"New password".toUpperCase()}
              </Text>
              <TextInput
                style={[
                  text.body,
                  styles.input,
                  { backgroundColor: palette.fill, borderCurve: shape.borderCurve },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={palette.tertiaryLabel}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
              />
            </View>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEmailStep ? "Send reset code" : "Reset password"}
          onPress={isEmailStep ? handleSendCode : handleReset}
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
              {isEmailStep ? "Send Code" : "Reset Password"}
            </Text>
          )}
        </Pressable>

        {!isEmailStep && (
          <Pressable
            accessibilityRole="button"
            onPress={handleSendCode}
            disabled={loading}
            style={[styles.linkButton, loading && styles.buttonDisabled]}
          >
            <Text style={[text.subheadline, { color: palette.tint }]}>
              Resend code
            </Text>
          </Pressable>
        )}

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
            <Text
              style={[text.footnote, styles.footerLink, { color: palette.tint }]}
            >
              Back to sign in
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
