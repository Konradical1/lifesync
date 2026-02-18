import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography, fontFamilyMedium, fontFamilySemiBold, fontFamilyBold, borderRadius } from '../theme/constants';

export default function CreateAccountScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
    if (password.length < 6) {
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('../../assets/JournalXWithText.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.heading}>Create your account</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
          />
        </View>

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
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 48,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    fontFamily: fontFamilyBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: typography.footnote.fontSize,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
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
    alignItems: 'center',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
