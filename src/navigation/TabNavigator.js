import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/constants';
import HomeStack from './HomeStack';
import InsightsStack from './InsightsStack';
import AddEventStack from './AddEventStack';
import CalendarStack from './CalendarStack';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator();

function AddEventTabIcon({ focused }) {
  return (
    <View style={styles.addButtonWrapper}>
      <View style={[styles.addButtonGlow]} />
      <View style={[styles.addButton, focused && styles.addButtonFocused]}>
        <Text style={[styles.addButtonText, focused && styles.addButtonTextFocused]}>+</Text>
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
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="InsightsTab"
        component={InsightsStack}
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="stats-chart-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddEventTab"
        component={AddEventStack}
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <AddEventTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: 'Settings',
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
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: typography.caption1.fontSize,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 22,
  },
  addButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  addButtonGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    opacity: 0.35,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 36,
    color: colors.background,
    fontWeight: '300',
  },
  addButtonTextFocused: {
    color: colors.background,
  },
});
