import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../store/ThemeContext";
import { addDaysToDate } from "../../utils/time";

const DAYS_IN_WEEK = 7;
const PILL_RADIUS = 12;

/** Monday-first week (YYYY-MM-DD keys) containing `day`. */
function weekOf(day) {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = Monday
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDaysToDate(day, i - weekday));
}

/** Week strip around the selected day: selected in a solid pill, today in tint, future dimmed. */
export default function WeekStrip({ day, today, onSelect }) {
  const { palette, text } = useTheme();

  return (
    <View style={styles.row}>
      {weekOf(day).map((key) => {
        const [y, m, d] = key.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const isSelected = key === day;
        const isToday = key === today;
        const isFuture = key > today;
        const dayName = date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
        const color = isSelected
          ? palette.background
          : isFuture
            ? palette.tertiaryLabel
            : isToday
              ? palette.tint
              : null;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Show food for ${dayName} ${d}${isToday ? ", today" : ""}`}
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            disabled={isFuture}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.day,
              isSelected && { backgroundColor: palette.label },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[text.caption, styles.dayName, color && { color }]}>{dayName}</Text>
            <Text
              style={[
                text.headline,
                styles.dayNumber,
                { color: color || palette.secondaryLabel },
              ]}
            >
              {String(d).padStart(2, "0")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
  },
  day: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    minWidth: 42,
    borderRadius: PILL_RADIUS,
    borderCurve: "continuous",
  },
  dayName: {
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
