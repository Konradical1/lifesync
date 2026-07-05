import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { fonts } from '../../theme/ios';

function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileHeader({ name, height, gender, weight }) {
  const { palette, text } = useTheme();
  const initials = getInitials(name);

  const weightDisplay = weight ? `${weight} lbs` : '';
  const subtitleParts = [height, gender, weightDisplay].filter(Boolean);
  const subtitle = subtitleParts.join('  •  ');

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: palette.fill }]}>
        <Text
          style={[
            styles.avatarText,
            { fontFamily: fonts.displayBold, color: palette.label },
          ]}
        >
          {initials}
        </Text>
      </View>

      <Text style={[text.title2, styles.name]}>{name || 'Your Name'}</Text>

      {subtitle ? (
        <Text style={text.footnote}>{subtitle}</Text>
      ) : (
        <Text style={[text.footnote, { color: palette.tertiaryLabel }]}>
          Tap "About You" below to set up your profile
        </Text>
      )}
    </View>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    lineHeight: 34,
  },
  name: {
    marginBottom: 4,
  },
});
