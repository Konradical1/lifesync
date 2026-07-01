import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../store/AuthContext";
import {
  colors,
  spacing,
  typography,
  fontFamilyMedium,
  fontFamilySemiBold,
  fontFamilyBold,
  borderRadius,
} from "../theme/constants";

export default function SignInScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signIn, skipAuthForLocalPreview } = useAuth();
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

  async function handleSkipAuth() {
    setError("");
    setLoading(true);
    try {
      await skipAuthForLocalPreview();
    } catch (e) {
      setError(e.message || "Could not enter preview mode.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.inner,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Image
          source={require("../../assets/JournalXWithText.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.heading}>Welcome back</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton, loading && styles.buttonDisabled]}
          onPress={handleSkipAuth}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Skip for local preview</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("CreateAccount")}
          >
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 48,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    fontFamily: fontFamilyBold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: "#EF4444",
    fontSize: typography.footnote.fontSize,
    fontFamily: fontFamilyMedium,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.footnote.fontSize,
    fontFamily: fontFamilySemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilyMedium,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilySemiBold,
    color: colors.background,
  },
  skipButton: {
    borderRadius: borderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skipButtonText: {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilySemiBold,
    color: colors.accent,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.footnote.fontSize,
    fontFamily: fontFamilyMedium,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: typography.footnote.fontSize,
    fontFamily: fontFamilySemiBold,
    color: colors.accent,
  },
});
