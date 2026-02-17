import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/constants';

const LOGO_HEIGHT = 44;
const LOGO_WIDTH = 180;

export default function Header() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
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
