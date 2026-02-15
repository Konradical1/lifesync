import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/constants';

export default function AddEventScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Add Event</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  text: { color: colors.textPrimary },
});
