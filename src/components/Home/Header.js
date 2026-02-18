import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/constants';

const LOGO_HEIGHT = 44;
const LOGO_WIDTH = 180;

export default function Header() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.logoWrap}>
        <Image
          source={require('../../../assets/JournalXWithText.png')}
          style={[styles.logo, { width: LOGO_WIDTH, height: LOGO_HEIGHT }]}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('HomeTab', { screen: 'Profile' })}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="person-outline" size={24} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    // Soft underglow (iOS)
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // Android elevation + subtle glow via border
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(88, 166, 255, 0.12)',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: -20,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
