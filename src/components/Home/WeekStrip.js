import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../store/ThemeContext";

const DAYS_IN_WEEK = 7;
const PILL_RADIUS = 12;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-first week containing today. */
function getCurrentWeek() {
  const today = new Date();
  const monday = new Date(today);
  const weekday = (today.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(today.getDate() - weekday);
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

/** Current-week day strip; today sits in a solid pill, future days are dimmed. */
export default function WeekStrip() {
  const navigation = useNavigation();
  const { palette, text } = useTheme();
  const week = useMemo(getCurrentWeek, []);
  const todayKey = formatDateKey(new Date());

  return (
    <View style={styles.row}>
      {week.map((date) => {
        const key = formatDateKey(date);
        const isToday = key === todayKey;
        const isFuture = key > todayKey;
        const dayName = date
          .toLocaleDateString(undefined, { weekday: "short" })
          .slice(0, 3);
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Open ${dayName} ${date.getDate()} in calendar`}
            accessibilityState={{ selected: isToday }}
            disabled={isFuture}
            onPress={() =>
              navigation.navigate("CalendarTab", {
                screen: "Calendar",
                params: { focusDate: key },
              })
            }
            style={({ pressed }) => [
              styles.day,
              isToday && { backgroundColor: palette.label },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                text.caption,
                styles.dayName,
                isToday && { color: palette.background },
                isFuture && { color: palette.tertiaryLabel },
              ]}
            >
              {dayName}
            </Text>
            <Text
              style={[
                text.headline,
                styles.dayNumber,
                { color: palette.secondaryLabel },
                isToday && { color: palette.background },
                isFuture && { color: palette.tertiaryLabel },
              ]}
            >
              {String(date.getDate()).padStart(2, "0")}
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
