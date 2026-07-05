import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_500Medium_Italic,
  Inter_600SemiBold_Italic,
} from "@expo-google-fonts/inter";
import { ThemeProvider, useTheme } from "./src/store/ThemeContext";
import { AuthProvider, useAuth } from "./src/store/AuthContext";
import { StoreProvider } from "./src/store/useStore";
import TabNavigator from "./src/navigation/TabNavigator";
import AuthStack from "./src/navigation/AuthStack";
import useNotifications from "./src/hooks/useNotifications";

function useNavTheme() {
  const { scheme, palette } = useTheme();
  const base = scheme === "light" ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.card,
      text: palette.label,
      border: palette.separator,
      notification: palette.tint,
    },
  };
}

function LoadingScreen() {
  const { palette } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: palette.background }]}>
      <ActivityIndicator size="large" color={palette.tint} />
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  useNotifications(user?.isLocalBypass ? null : (user?.id ?? null));

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthStack />;
  }

  return (
    <StoreProvider>
      <TabNavigator />
    </StoreProvider>
  );
}

function ThemedApp() {
  const navTheme = useNavTheme();
  const { scheme } = useTheme();

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_500Medium_Italic,
    Inter_600SemiBold_Italic,
    "Bicyclette-Light": require("./assets/fonts/Bicyclette-Light.otf"),
    "Bicyclette-Regular": require("./assets/fonts/Bicyclette-Regular.otf"),
    "Bicyclette-Bold": require("./assets/fonts/Bicyclette-Bold.otf"),
    "Bicyclette-Black": require("./assets/fonts/Bicyclette-Black.otf"),
    "Tanseek-Light": require("./assets/fonts/Tanseek-Light.ttf"),
    "Tanseek-Medium": require("./assets/fonts/Tanseek-Medium.ttf"),
  });

  if (!fontsLoaded) {
    // No ThemeProvider mounted yet at this point — safe static dark default.
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
});
