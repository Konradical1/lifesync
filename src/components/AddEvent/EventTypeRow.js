import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../theme/constants";
import { EVENT_TYPE_COLORS } from "../../theme/constants";

const SUBTITLES = {
  sleep: "Log sleep start and end times",
  food: "Log meals and snacks",
  exercise: "Log workouts and activity",
  meds: "Log medications and supplements",
  other: "Log anything else",
};

export default function EventTypeRow({
  type,
  iconName,
  label,
  subtitle: subtitleProp,
  tintColor: tintColorProp,
  onPress,
  style,
}) {
  const tintColor = tintColorProp ?? EVENT_TYPE_COLORS[type] ?? colors.accent;
  const subtitle = subtitleProp ?? SUBTITLES[type] ?? "";
  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderColor: tintColor + "44", backgroundColor: tintColor + "16" },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: tintColor + "24" }]}>
        <Ionicons name={iconName} size={22} color={tintColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: typography.headline.fontSize,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  subtitleText: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
