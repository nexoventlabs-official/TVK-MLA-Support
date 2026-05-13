import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

const Input = forwardRef(function Input(
  { label, hint, error, leftAdornment, rightAdornment, style, inputStyle, ...rest },
  ref
) {
  return (
    <View style={[styles.wrap, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, error && styles.rowError]}>
        {leftAdornment}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, inputStyle]}
          {...rest}
        />
        {rightAdornment}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rowError: { borderColor: colors.red },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: 12,
  },
  hint: { ...typography.caption, color: colors.textFaint, marginTop: 6 },
  error: { ...typography.caption, color: colors.red, marginTop: 6 },
});

export default Input;
