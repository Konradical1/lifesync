import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LiquidGlass } from "../components/ui/LiquidGlass";
import { useTheme } from "../store/ThemeContext";
import HomeStack from "./HomeStack";
import InsightsStack from "./InsightsStack";
import AddEventStack from "./AddEventStack";
import CalendarStack from "./CalendarStack";
import SettingsStack from "./SettingsStack";

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_RADIUS = 32;
const TAB_BAR_MARGIN = 16;
const ADD_BUTTON_SIZE = 40;

function makeTabIcon(name) {
  return ({ focused, color }) => (
    <Ionicons name={focused ? name : `${name}-outline`} size={24} color={color} />
  );
}

function AddButton({ tint }) {
  return (
    <View style={[styles.addButton, { backgroundColor: tint }]}>
      <Ionicons name="add" size={26} color="#FFFFFF" />
    </View>
  );
}

/** iOS 26-style floating glass tab bar. */
export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { bottom: Math.max(insets.bottom, 12) },
        ],
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.secondaryLabel,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <LiquidGlass style={styles.tabBarGlass} />,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: makeTabIcon("home"),
        }}
      />
      <Tab.Screen
        name="InsightsTab"
        component={InsightsStack}
        options={{
          title: "Insights",
          tabBarIcon: makeTabIcon("stats-chart"),
        }}
      />
      <Tab.Screen
        name="AddEventTab"
        component={AddEventStack}
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: "Add event",
          tabBarIcon: () => <AddButton tint={palette.tint} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Always resurface the type picker on tab press — otherwise React
            // Navigation keeps whichever event screen was last opened focused
            // forever, so Cancel-then-log-something-else gets stuck on it.
            e.preventDefault();
            navigation.navigate("AddEventTab", { screen: "EventTypeList" });
          },
        })}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          title: "Calendar",
          tabBarIcon: makeTabIcon("calendar"),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: "Settings",
          tabBarIcon: makeTabIcon("settings"),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: TAB_BAR_HEIGHT,
    paddingTop: 6,
    paddingBottom: 8,
    borderRadius: TAB_BAR_RADIUS,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_RADIUS,
    overflow: "hidden",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: ADD_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
});
