import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/AuthContext";
import {
  colors,
  spacing,
  typography,
  fontFamilyMedium,
  fontFamilySemiBold,
  borderRadius,
} from "../theme/constants";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email || "";

  const testMessages = [
    {
      title: "JournalX",
      body: '🍽️ "Did you eat today? Logging meals helps spot patterns."',
    },
    { title: "JournalX", body: '📝 "Take 2 minutes to reflect on your day."' },
    {
      title: "JournalX",
      body: '💧 "A little water might boost your energy right now."',
    },
    { title: "JournalX", body: '🌙 "How did today really feel?"' },
  ];

  async function handleTestNotification() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        Alert.alert(
          "Permissions needed",
          "Enable notifications in your device settings.",
        );
        return;
      }
    }

    const msg = testMessages[Math.floor(Math.random() * testMessages.length)];
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, sound: "default" },
      trigger: { type: "timeInterval", seconds: 2, repeats: false },
    });

    Alert.alert("Sent!", "A test notification will appear in ~2 seconds.");
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await AsyncStorage.multiRemove([
              "@journalx_profile",
              "@journalx_insights",
              "@journalx_water",
            ]);
            await signOut();
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to sign out.");
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
        <Text style={styles.eyebrow}>JournalX</Text>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons
              name="person-circle-outline"
              size={40}
              color={colors.accent}
            />
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
        <Text style={styles.sectionTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.testNotifButton}
          onPress={handleTestNotification}
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={colors.accent}
          />
          <Text style={styles.testNotifText}>Send Test Notification</Text>
        </TouchableOpacity>
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
    paddingBottom: 140,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: spacing.xxs,
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.caption1,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  accountCard: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 24,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 22,
      },
      android: {
        elevation: 3,
      },
    }),
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
  testNotifButton: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 20,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  testNotifText: {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilySemiBold,
    color: colors.accent,
  },
  signOutButton: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 20,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
  },
  signOutText: {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamilySemiBold,
    color: "#EF4444",
  },
});
