import React from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography } from '../theme';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will need to log in again to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const name = user?.name || user?.username || 'Citizen';
  const roleDisplay = role === 'admin' ? 'Admin Account' : 'Citizen Account';

  return (
    <Screen showBack={true}>
      {/* Centered Hero Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.nameText}>{name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleDisplay.toUpperCase()}</Text>
        </View>
      </View>

      <Card style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Row icon="phone" label="Phone" value={user?.phone || '—'} />
        {user?.epicNo && <Row icon="credit-card" label="EPIC ID" value={user.epicNo} />}
        {user?.email && <Row icon="mail" label="Email" value={user.email} />}
      </Card>

      <View style={{ marginTop: spacing.xxl }}>
        <Button 
          label="Sign out" 
          variant="secondary" 
          onPress={confirmSignOut} 
          icon={<Feather name="log-out" size={18} color={colors.red} />}
          textStyle={{ color: colors.red }}
        />
      </View>
    </Screen>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Feather name={icon} size={18} color={colors.brand700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { height: 4 } },
      android: { elevation: 8 }
    }),
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#990000' },
  nameText: { ...typography.h1, fontSize: 26, color: colors.text, marginBottom: spacing.xs },
  roleBadge: {
    backgroundColor: 'rgba(153,0,0,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: { ...typography.captionBold, color: '#990000', letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(153,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase' },
  value: { ...typography.bodyBold, color: colors.text, marginTop: 2 },
});
