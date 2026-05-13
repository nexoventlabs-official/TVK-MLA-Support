import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography } from '../theme';

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will need to log in again to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen title="Profile" subtitle={role === 'admin' ? 'Admin account' : 'Citizen account'}>
      <Card style={{ gap: spacing.sm }}>
        <Row label="Name" value={user?.name || user?.username || '—'} />
        <Row label="Phone" value={user?.phone || '—'} />
        <Row label="Role" value={role === 'admin' ? user?.role || 'admin' : 'Citizen'} />
        {user?.epicNo && <Row label="EPIC" value={user.epicNo} />}
        {user?.email && <Row label="Email" value={user.email} />}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
      </View>
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', width: 80 },
  value: { ...typography.body, color: colors.text, flex: 1 },
});
