import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function MoreScreen({ navigation }) {
  const { user } = useAuth();

  const items = [
    { label: 'Voters', helper: 'Read-only voter roll', icon: '🗳️', screen: 'Voters' },
    { label: 'Campaigns', helper: 'WhatsApp broadcast campaigns', icon: '📢', screen: 'Campaigns' },
    { label: 'Events', helper: 'Manage upcoming events', icon: '📅', screen: 'Events' },
    { label: 'Flow Images', helper: 'WhatsApp & portal media library', icon: '🖼️', screen: 'FlowImages' },
    { label: 'Profile', helper: 'Account details & sign out', icon: '👤', screen: 'Profile' },
  ];

  return (
    <Screen title="More" subtitle={user?.username ? `Signed in as ${user.username}` : 'Admin tools'}>
      {items.map((it) => (
        <Card
          key={it.screen}
          onPress={() => navigation.navigate(it.screen)}
          style={styles.row}
        >
          <Text style={styles.icon}>{it.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.helper}>{it.helper}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  icon: { fontSize: 28 },
  label: { ...typography.bodyBold, color: colors.text },
  helper: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chev: { fontSize: 28, color: colors.textFaint },
});
