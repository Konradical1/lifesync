import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography, fontFamilyMedium, fontFamilySemiBold, borderRadius } from '../theme/constants';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email || '';

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await AsyncStorage.multiRemove([
              '@journalx_profile',
              '@journalx_insights',
              '@journalx_water',
            ]);
            await signOut();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to sign out.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
          </View>
          <View style={styles.accountInfo}>
            {!!displayName && displayName !== user?.email && (
              <Text style={styles.accountName}>{displayName}</Text>
            )}
            <Text style={styles.accountEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Settings options coming soon</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          {signingOut ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    color: colors.textPrimary,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    marginRight: spacing.sm,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilySemiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: typography.footnote.fontSize,
    fontFamily: fontFamilyMedium,
    color: colors.textSecondary,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textTertiary,
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  signOutText: {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilySemiBold,
    color: '#EF4444',
  },
});
