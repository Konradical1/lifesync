import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LiquidGlass } from "../ui/LiquidGlass";
import { useTheme } from "../../store/ThemeContext";

const PROFILE_BUTTON_SIZE = 40;
const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 17;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < MORNING_END_HOUR) return "good morning.";
  if (hour < AFTERNOON_END_HOUR) return "good afternoon.";
  return "good evening.";
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/** Home header: oversized lowercase greeting, date beneath, profile button. */
export default function Header() {
  const navigation = useNavigation();
  const { palette, text } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.greetingColumn}>
          <Text style={text.display} accessibilityRole="header">
            {getGreeting()}
          </Text>
          <Text style={[text.footnote, styles.date]}>{formatToday()}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={8}
          onPress={() => navigation.navigate("HomeTab", { screen: "Profile" })}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <LiquidGlass interactive style={styles.profileButton}>
            <Ionicons name="person" size={18} color={palette.label} />
          </LiquidGlass>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  greetingColumn: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    marginTop: 4,
  },
  profileButton: {
    width: PROFILE_BUTTON_SIZE,
    height: PROFILE_BUTTON_SIZE,
    borderRadius: PROFILE_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
