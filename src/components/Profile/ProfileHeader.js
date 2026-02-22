import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, spacing, typography, borderRadius } from '../../theme/constants';

function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileHeader({ name, height, gender, weight }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const initials = getInitials(name);

  const weightDisplay = weight ? `${weight} lbs` : '';
  const subtitleParts = [height, gender, weightDisplay].filter(Boolean);
  const subtitle = subtitleParts.join('  •  ');

  return (
    <View
      style={styles.container}
      onLayout={(e) =>
        setLayout({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {layout.width > 0 && layout.height > 0 && (
        <Svg
          style={styles.gradient}
          width={layout.width}
          height={layout.height}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="profileHeaderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={colors.surface} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={layout.width}
            height={layout.height}
            fill="url(#profileHeaderGrad)"
          />
        </Svg>
      )}

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <Text style={styles.name}>{name || 'Your Name'}</Text>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : (
        <Text style={styles.subtitlePlaceholder}>Tap "About You" below to set up your profile</Text>
      )}
    </View>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.accent + '25',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: typography.title1.fontWeight,
    fontFamily: typography.fontFamilyBold,
    color: colors.accent,
  },
  name: {
    fontSize: typography.title2.fontSize,
    fontWeight: typography.title2.fontWeight,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: typography.subhead.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
  },
  subtitlePlaceholder: {
    fontSize: typography.footnote.fontSize,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});
