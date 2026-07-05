import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../ui/Card";
import { useTheme } from "../../store/ThemeContext";
import { EVENT_TYPE_COLORS } from "../../theme/constants";

const ICON_CIRCLE_SIZE = 44;

const SUBTITLES = {
  sleep: "Log sleep start and end times",
  food: "Log meals and snacks",
  exercise: "Log workouts and activity",
  meds: "Log medications and supplements",
  other: "Log anything else",
};

/** One event-type choice: solid card, accent icon circle, label + subtitle. */
export default function EventTypeRow({
  type,
  iconName,
  label,
  subtitle: subtitleProp,
  tintColor: tintColorProp,
  onPress,
  style,
}) {
  const { palette, text } = useTheme();
  const tintColor = tintColorProp ?? EVENT_TYPE_COLORS[type] ?? palette.tint;
  const subtitle = subtitleProp ?? SUBTITLES[type] ?? "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      <Card style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: tintColor + "24" }]}>
          <Ionicons name={iconName} size={22} color={tintColor} />
        </View>
        <View style={styles.content}>
          <Text style={text.headline}>{label}</Text>
          <Text style={[text.footnote, styles.subtitleText]}>{subtitle}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.tertiaryLabel}
        />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  subtitleText: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
