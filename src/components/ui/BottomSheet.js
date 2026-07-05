import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../store/ThemeContext';

const ANIM_DURATION = 220;
const SLIDE_OFFSET = 32;

/**
 * Shared bottom-anchored sheet: dimmed backdrop (tap to dismiss), themed
 * panel with a drag handle, keyboard-avoiding on iOS. Replaces the several
 * ad hoc Modal-as-sheet implementations scattered around the app.
 */
export default function BottomSheet({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.85,
}) {
  const { palette, shape } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_OFFSET)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    translateY.setValue(SLIDE_OFFSET);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.kav}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.cardElevated,
                borderTopLeftRadius: shape.cardRadius,
                borderTopRightRadius: shape.cardRadius,
                borderCurve: shape.borderCurve,
                maxHeight: Dimensions.get('window').height * maxHeightRatio,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: palette.separator }]} />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    paddingBottom: 24,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
});
