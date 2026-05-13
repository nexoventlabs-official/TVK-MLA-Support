import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import { colors, spacing, typography } from '../theme';

/**
 * Generic placeholder used during the phased build-out. Every screen in the
 * router is wired up from day 1 so the bottom-tab + drawer layouts are real;
 * unimplemented screens just render this card with a friendly TODO note
 * instead of crashing on undefined imports.
 */
export default function Placeholder({ route, navigation, name, description }) {
  const label = name || route?.name || 'Coming soon';
  return (
    <Screen title={label} subtitle={description || 'This screen is part of the upcoming build phase.'}>
      <Card>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.body}>
          We're wiring this screen up next. The navigation, theme, API client and
          backend integration are already in place — UI is on the way.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 36, textAlign: 'center', marginBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
