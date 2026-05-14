import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, typography, radius } from '../../theme';
import { Feather } from '@expo/vector-icons';

export default function MoreScreen({ navigation }) {
  const { user } = useAuth();

  const items = [
    { label: 'Voters', helper: 'Read-only voter roll', icon: 'clipboard', screen: 'Voters' },
    { label: 'Campaigns', helper: 'WhatsApp broadcast campaigns', icon: 'send', screen: 'Campaigns' },
    { label: 'Events', helper: 'Manage upcoming events', icon: 'calendar', screen: 'Events' },
    { label: 'Flow Images', helper: 'WhatsApp & portal media library', icon: 'image', screen: 'FlowImages' },
    { label: 'Profile', helper: 'Account details & sign out', icon: 'user', screen: 'Profile' },
  ];

  return (
    <Screen>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More Options</Text>
      </View>

      <View style={styles.listContainer}>
        {items.map((it) => (
          <Card
            key={it.screen}
            onPress={() => navigation.navigate(it.screen)}
            style={styles.row}
          >
            <View style={styles.iconBox}>
              <Feather name={it.icon} size={20} color={colors.brand700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{it.label}</Text>
              <Text style={styles.helper}>{it.helper}</Text>
            </View>
            <Feather name="chevron-right" size={24} color={colors.textFaint} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xl },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,215,0,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  headerBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { ...typography.h1, fontSize: 28, color: colors.text },
  
  listContainer: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(153,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  helper: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
