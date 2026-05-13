import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../theme';

export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ label, value, helper, accent, onPress }) {
  return (
    <Card onPress={onPress} style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
      {helper && <Text style={styles.statHelper}>{helper}</Text>}
    </Card>
  );
}

export function Badge({ label, color = colors.textMuted, soft = false }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: soft ? `${color}1a` : 'transparent' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  stat: { gap: 2 },
  statLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase' },
  statValue: { ...typography.display, color: colors.text, marginTop: 4 },
  statHelper: { ...typography.caption, color: colors.textFaint, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  badgeText: { ...typography.caption, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
});

export default Card;
