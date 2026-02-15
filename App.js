import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from './src/theme/constants';
import { StoreProvider } from './src/store/useStore';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
        <NavigationContainer
          theme={{
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              primary: colors.accent,
              background: colors.background,
              card: colors.surface,
              text: colors.textPrimary,
              border: colors.border,
              notification: colors.accent,
            },
          }}
        >
          <StatusBar style="light" />
          <TabNavigator />
        </NavigationContainer>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
