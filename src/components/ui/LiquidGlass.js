import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '../../store/ThemeContext';

// True only on iOS 26+ builds; everywhere else we fall back to a blur.
export const hasNativeGlass = isLiquidGlassAvailable();

const FALLBACK_INTENSITY = 40;
const FALLBACK_TINT_BACKGROUND = {
  light: 'rgba(255,255,255,0.6)',
  dark: 'rgba(28,28,30,0.5)',
};

/**
 * Liquid Glass surface. Native UIGlassEffect on iOS 26+, BlurView elsewhere
 * (web renders it as a CSS backdrop blur). Reserve for chrome and controls —
 * bars, buttons — never content cards, per the Liquid Glass HIG. Follows the
 * active light/dark scheme from ThemeContext.
 */
export function LiquidGlass({ style, tintColor, interactive = false, children, ...rest }) {
  const { scheme, palette } = useTheme();
  if (hasNativeGlass) {
    return (
      <GlassView
        style={style}
        tintColor={tintColor}
        isInteractive={interactive}
        colorScheme={scheme}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView
      tint={scheme}
      intensity={FALLBACK_INTENSITY}
      style={[
        styles.fallback,
        {
          borderColor: palette.glassBorder,
          backgroundColor: FALLBACK_TINT_BACKGROUND[scheme],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </BlurView>
  );
}

/**
 * Groups sibling glass shapes so they merge and morph together on iOS 26.
 * Plain layout container on other platforms.
 */
export function LiquidGlassGroup({ spacing = 12, style, children }) {
  if (hasNativeGlass) {
    return (
      <GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
