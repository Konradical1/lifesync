import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

/** Standard iOS content card: solid surface, continuous corners, no border. Theme-reactive. */
export default function Card({ style, children, ...rest }) {
  const { palette, shape } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderRadius: shape.cardRadius,
          borderCurve: shape.borderCurve,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
});
