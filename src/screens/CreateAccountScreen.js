import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { fonts } from '../theme/ios';
import SocialAuthButtons from '../components/Auth/SocialAuthButtons';

const SCREEN_MARGIN = 24;
const HERO_TOP_OFFSET = 60;
const INPUT_HEIGHT = 48;
const INPUT_RADIUS = 14;
const CTA_HEIGHT = 48;
const MIN_PASSWORD_LENGTH = 6;

export default function CreateAccountScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { palette, text, shape } = useTheme();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, username);
    } catch (e) {
      setError(e.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          {
            paddingTop: insets.top + HERO_TOP_OFFSET,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={text.display} accessibilityRole="header">
          let's begin.
        </Text>
        <Text style={[text.footnote, styles.subtitle]}>
          A few details and your journal is ready.
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
            {'Username'.toUpperCase()}
          </Text>
          <TextInput
            style={[
              text.body,
              styles.input,
              { backgroundColor: palette.fill, borderCurve: shape.borderCurve },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            placeholderTextColor={palette.tertiaryLabel}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[text.eyebrow, styles.label]}>
            {'Email'.toUpperCase()}
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
            {'Password'.toUpperCase()}
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create account"
          onPress={handleCreate}
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
              Create Account
            </Text>
          )}
        </Pressable>

        <SocialAuthButtons onError={setError} disabled={loading} />

        <View style={styles.footer}>
          <Text style={text.footnote}>Already have an account? </Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
            <Text
              style={[text.footnote, styles.footerLink, { color: palette.tint }]}
            >
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerLink: {
    fontFamily: fonts.bodyMedium,
  },
});
