import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  typography,
  fontFamilyMedium,
  fontFamilyBold,
} from "../theme/constants";
import HomeStack from "./HomeStack";
import InsightsStack from "./InsightsStack";
import AddEventStack from "./AddEventStack";
import CalendarStack from "./CalendarStack";
import SettingsStack from "./SettingsStack";

const Tab = createBottomTabNavigator();

function AddEventTabIcon({ focused }) {
  return (
    <View style={styles.addButtonWrapper}>
      <View style={[styles.addButtonGlow]} />
      <View style={[styles.addButton, focused && styles.addButtonFocused]}>
        <Text
          style={[styles.addButtonText, focused && styles.addButtonTextFocused]}
        >
          +
        </Text>
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="InsightsTab"
        component={InsightsStack}
        options={{
          title: "Insights",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="stats-chart-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddEventTab"
        component={AddEventStack}
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <AddEventTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="settings-outline" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: Platform.OS === "ios" ? spacing.md : spacing.sm,
    height: Platform.OS === "ios" ? 78 : 70,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    borderRadius: 28,
    backgroundColor: "rgba(22,27,34,0.92)",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabLabel: {
    fontSize: typography.caption1.fontSize,
    fontFamily: fontFamilyMedium,
    marginTop: 2,
  },
  tabIcon: {
    fontSize: 22,
  },
  addButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 26 : 22,
  },
  addButtonGlow: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    opacity: 0.22,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "rgba(88,166,255,0.22)",
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addButtonFocused: {
    backgroundColor: colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOpacity: 1,
        shadowRadius: 18,
      },
    }),
  },
  addButtonText: {
    fontSize: 38,
    lineHeight: 40,
    color: colors.background,
    fontFamily: fontFamilyBold,
  },
  addButtonTextFocused: {
    color: colors.background,
  },
});
