import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';

export default function Screen({
  children,
  title,
  subtitle,
  loading = false,
  refreshing = false,
  onRefresh,
  scroll = true,
  padded = true,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
  rightAction,
}) {
  const Body = scroll ? ScrollView : View;
  const refreshProps =
    scroll && onRefresh
      ? {
          refreshControl: (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand500}
              colors={[colors.brand500]}
            />
          ),
        }
      : {};

  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {(title || subtitle) && (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {rightAction}
        </View>
      )}
      <Body
        style={styles.body}
        contentContainerStyle={[
          padded && styles.padded,
          scroll && { paddingBottom: spacing.xxl },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        {...refreshProps}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand600} />
          </View>
        ) : (
          children
        )}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
