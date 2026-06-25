import React, { useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme/constants";

const LOGO_HEIGHT = 28;
const LOGO_WIDTH = 116;

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function Header() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const todayLabel = useMemo(() => formatToday(), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}> 
      <View style={styles.topRow}>
        <View style={styles.logoPill}>
          <Image
            source={require("../../../assets/JournalXWithText.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("HomeTab", { screen: "Profile" })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.82}
        >
          <Ionicons
            name="person-outline"
            size={21}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.dateLabel}>{todayLabel}</Text>
        <Text style={styles.title}>Today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: "transparent",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoPill: {
    height: 38,
    minWidth: 132,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleBlock: {
    marginTop: spacing.lg,
  },
  dateLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  title: {
    marginTop: 2,
    fontSize: 42,
    lineHeight: 48,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
});
