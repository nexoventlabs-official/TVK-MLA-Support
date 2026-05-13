import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

export default function SplashScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <Text style={styles.title}>TVK</Text>
        <Text style={styles.subtitle}>Mylapore Grievance Service</Text>
      </View>
      <ActivityIndicator color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brand800,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  brand: { alignItems: 'center', gap: spacing.xs },
  title: { ...typography.display, fontSize: 56, color: '#fff', letterSpacing: 4 },
  subtitle: { color: colors.brand200, letterSpacing: 1.5, fontSize: 13, fontWeight: '600' },
});
