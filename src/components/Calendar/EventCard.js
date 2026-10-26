import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EVENT_ICON_NAMES, EVENT_TYPES } from "../../store/mockData";
import { formatTime12h } from "../../utils/time";
import { useTheme } from "../../store/ThemeContext";
import { fonts } from "../../theme/ios";

function getEventDescription(event) {
  switch (event.type) {
    case EVENT_TYPES.sleep:
      return `${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`;
    case EVENT_TYPES.food:
      return `${event.description || "Meal"} · ${event.calories || 0} kcal`;
    case EVENT_TYPES.exercise:
      return `${event.description ?? "Exercise"} · ${event.duration || 0} min`;
    case EVENT_TYPES.meds:
      return `${event.name} · ${event.dosage}${event.unit ?? "mg"}`;
    case EVENT_TYPES.other:
      return event.note ?? "Note";
    default:
      return "Event";
  }
}

function getEventTimeRange(event) {
  if (event.type === EVENT_TYPES.sleep && event.startTime && event.endTime) {
    return `${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`;
  }
  if (event.type === EVENT_TYPES.other && event.startTime && event.endTime) {
    return `${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`;
  }
  const t = event.time ?? event.startTime;
  return t ? formatTime12h(t) : "";
}

export default function EventCard({
  event,
  onPress,
  color,
  compact = false,
  horizontal = false,
  pressable = true,
}) {
  const { palette, text } = useTheme();
  const eventColor = color ?? palette.tint;

  if (compact) {
    const desc = getEventDescription(event);
    const Wrapper = pressable ? TouchableOpacity : View;
    return (
      <Wrapper
        style={[
          compactStyles.card,
          horizontal && compactStyles.cardHorizontal,
          { backgroundColor: eventColor + "24" },
        ]}
        onPress={pressable ? () => onPress(event) : undefined}
        activeOpacity={pressable ? 0.8 : undefined}
      >
        <View
          style={[
            compactStyles.inner,
            horizontal && compactStyles.innerHorizontal,
          ]}
        >
          {horizontal ? (
            <>
              <View
                style={[
                  compactStyles.colorBar,
                  { backgroundColor: eventColor },
                ]}
              />
              <Ionicons
                name={EVENT_ICON_NAMES[event.type] ?? "document-text-outline"}
                size={16}
                color={eventColor}
                style={compactStyles.iconInline}
              />
              <Text
                style={[
                  text.caption,
                  compactStyles.desc,
                  { color: palette.label },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {event.type === EVENT_TYPES.sleep ? "Sleep" : desc}
              </Text>
              <Text style={[compactStyles.timeInline, { color: eventColor }]}>
                {getEventTimeRange(event)}
              </Text>
            </>
          ) : (
            <>
              <View style={compactStyles.titleRow}>
                <Ionicons
                  name={EVENT_ICON_NAMES[event.type] ?? "document-text-outline"}
                  size={15}
                  color={eventColor}
                />
                <Text style={[compactStyles.time, { color: eventColor }]}>
                  {formatTime12h(event.time ?? event.startTime)}
                </Text>
              </View>
              <Text
                style={[
                  text.caption,
                  compactStyles.desc,
                  { color: palette.label },
                ]}
                numberOfLines={2}
              >
                {desc}
              </Text>
            </>
          )}
        </View>
      </Wrapper>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: palette.card }]}
      onPress={() => onPress(event)}
      activeOpacity={0.8}
    >
      <View style={[styles.bar, { backgroundColor: eventColor }]} />
      <View style={styles.content}>
        <Text style={[text.caption, styles.time, { color: eventColor }]}>
          {getEventTimeRange(event) ||
            formatTime12h(event.time ?? event.startTime)}
        </Text>
        <Ionicons
          name={EVENT_ICON_NAMES[event.type] ?? "document-text-outline"}
          size={18}
          color={eventColor}
          style={styles.icon}
        />
        <Text
          style={[text.caption, styles.description, { color: palette.label }]}
          numberOfLines={1}
        >
          {getEventDescription(event)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  bar: {
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  time: {
    width: 48,
  },
  icon: {
    marginRight: 6,
  },
  description: {
    flex: 1,
  },
});

const compactStyles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 2,
    marginVertical: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHorizontal: {
    marginVertical: 2,
  },
  inner: {
    flex: 1,
    padding: 8,
    gap: 4,
  },
  innerHorizontal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  timeInline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    marginLeft: "auto",
  },
  iconInline: {
    marginRight: 2,
  },
  desc: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  colorBar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
  },
});
