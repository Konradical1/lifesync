import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkPalette, lightPalette, buildTextStyles, shape } from "../theme/ios";

const ThemeContext = createContext(null);
const THEME_MODE_KEY = "@journalx_theme_mode";
const VALID_MODES = ["light", "dark", "system"];
const DEFAULT_MODE = "dark";

/**
 * Provides the resolved light/dark palette app-wide and persists the user's
 * Light / Dark / System preference. `mode` is what the user picked; `scheme`
 * is the resolved 'light'|'dark' after applying `mode === 'system'`.
 */
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState(DEFAULT_MODE);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_MODE_KEY).then((stored) => {
      if (mounted && stored && VALID_MODES.includes(stored)) {
        setModeState(stored);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode) => {
    if (!VALID_MODES.includes(nextMode)) return;
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_MODE_KEY, nextMode);
  }, []);

  const scheme =
    mode === "system" ? (systemScheme === "light" ? "light" : "dark") : mode;
  const resolvedPalette = scheme === "light" ? lightPalette : darkPalette;

  const value = useMemo(
    () => ({
      mode,
      scheme,
      setMode,
      palette: resolvedPalette,
      text: buildTextStyles(resolvedPalette),
      shape,
    }),
    [mode, scheme, setMode, resolvedPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
