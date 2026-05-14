import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

export default function Button({
  label,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size = 'md',         // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}) {
  const s = computeStyle(variant, size, disabled || loading);
  return (
    <Pressable
      onPress={loading || disabled ? undefined : onPress}
      style={({ pressed }) => [
        s.button,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !disabled && !loading && { opacity: 0.85 },
        style,
        (disabled || loading) && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={s.text.color} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon}
          <Text style={[s.text, textStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function computeStyle(variant, size, disabled) {
  const base = {
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
      paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 16 : 12,
      borderWidth: 1,
    },
    text: { ...typography.bodyBold, fontSize: size === 'sm' ? 13 : 15 },
  };
  if (variant === 'primary') {
    base.button.backgroundColor = disabled ? colors.brand300 : colors.tvkYellow;
    base.button.borderColor = disabled ? colors.brand300 : colors.tvkYellow;
    base.text.color = colors.brand700;
  } else if (variant === 'secondary') {
    base.button.backgroundColor = '#fff';
    base.button.borderColor = colors.borderStrong;
    base.text.color = disabled ? colors.textFaint : colors.text;
  } else if (variant === 'ghost') {
    base.button.backgroundColor = 'transparent';
    base.button.borderColor = 'transparent';
    base.text.color = disabled ? colors.textFaint : colors.brand700;
  } else if (variant === 'danger') {
    base.button.backgroundColor = disabled ? '#fca5a5' : colors.red;
    base.button.borderColor = disabled ? '#fca5a5' : colors.red;
    base.text.color = '#fff';
  }
  return StyleSheet.create(base);
}
