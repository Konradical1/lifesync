import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/AuthContext";
import { useTheme } from "../store/ThemeContext";
import { fonts } from "../theme/ios";
import Card from "../components/ui/Card";
import SegmentedControl from "../components/ui/SegmentedControl";

const SCREEN_MARGIN = 20;

const THEME_MODE_OPTIONS = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

const TEST_MESSAGES = [
  {
    title: "LifeSync",
    body: '🍽️ "Did you eat today? Logging meals helps spot patterns."',
  },
  { title: "LifeSync", body: '📝 "Take 2 minutes to reflect on your day."' },
  {
    title: "LifeSync",
    body: '💧 "A little water might boost your energy right now."',
  },
  { title: "LifeSync", body: '🌙 "How did today really feel?"' },
];

/** Centered letterspaced-caps section divider, matching the Home screen. */
function SectionLabel({ children }) {
  const { text } = useTheme();
  return (
    <View style={styles.sectionLabel} accessibilityRole="header">
      <Text style={text.eyebrow}>{children.toUpperCase()}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { palette, text, mode, setMode } = useTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email || "";

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

    const msg = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];
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

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and all of your data — events, journal entries, moods, water logs, and profile. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "All of your LifeSync data will be gone forever.",
              [
                { text: "Keep my account", style: "cancel" },
                {
                  text: "Delete everything",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await AsyncStorage.multiRemove([
                        "@journalx_profile",
                        "@journalx_insights",
                        "@journalx_water",
                      ]);
                      await deleteAccount();
                    } catch (e) {
                      Alert.alert(
                        "Error",
                        e.message || "Failed to delete account.",
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[text.display, styles.title]} accessibilityRole="header">
        settings.
      </Text>

      <SectionLabel>Appearance</SectionLabel>
      <Card style={styles.card}>
        <SegmentedControl
          options={THEME_MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          accessibilityLabel="Appearance"
        />
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card style={[styles.card, styles.accountCard]}>
        <Ionicons name="person-circle" size={40} color={palette.tint} />
        <View style={styles.accountInfo}>
          {!!displayName && displayName !== user?.email && (
            <Text style={[text.body, { fontFamily: fonts.bodyMedium }]}>
              {displayName}
            </Text>
          )}
          <Text style={[text.footnote, { color: palette.secondaryLabel }]}>
            {user?.email}
          </Text>
        </View>
      </Card>

      <SectionLabel>Notifications</SectionLabel>
      <Pressable
        accessibilityRole="button"
        onPress={handleTestNotification}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={[styles.card, styles.rowCard]}>
          <Ionicons name="notifications" size={20} color={palette.tint} />
          <Text
            style={[text.body, { fontFamily: fonts.bodyMedium, color: palette.tint }]}
          >
            Send Test Notification
          </Text>
        </Card>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={handleSignOut}
        disabled={signingOut}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={[styles.card, styles.rowCard, styles.signOutCard]}>
          {signingOut ? (
            <ActivityIndicator color={palette.red} size="small" />
          ) : (
            <>
              <Ionicons name="log-out" size={20} color={palette.red} />
              <Text
                style={[text.body, { fontFamily: fonts.bodyMedium, color: palette.red }]}
              >
                Sign Out
              </Text>
            </>
          )}
        </Card>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={handleDeleteAccount}
        disabled={deleting || signingOut}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={[styles.card, styles.rowCard, styles.deleteCard]}>
          {deleting ? (
            <ActivityIndicator color={palette.red} size="small" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color={palette.red} />
              <Text
                style={[text.body, { fontFamily: fonts.bodyMedium, color: palette.red }]}
              >
                Delete Account
              </Text>
            </>
          )}
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 140,
  },
  title: {
    marginHorizontal: SCREEN_MARGIN,
    marginBottom: 8,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginHorizontal: SCREEN_MARGIN,
    marginTop: 30,
    marginBottom: 12,
  },
  card: {
    marginHorizontal: SCREEN_MARGIN,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutCard: {
    marginTop: 24,
  },
  deleteCard: {
    marginTop: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
