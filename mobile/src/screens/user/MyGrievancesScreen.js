import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import Button from '../../components/Button';
import { colors, spacing, typography, statusColor } from '../../theme';
import * as portal from '../../api/portal';

export default function MyGrievancesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await portal.getMyGrievances();
      setItems(d?.requests || []);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  return (
    <Screen
      title="My Grievances"
      subtitle={items.length ? `${items.length} ticket${items.length === 1 ? '' : 's'}` : 'Track your tickets'}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      {items.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No grievances yet</Text>
          <Text style={styles.emptyBody}>Raise your first grievance to track it here.</Text>
          <Button
            label="Raise a grievance"
            onPress={() => navigation.navigate('HomeTab', { screen: 'NewGrievance' })}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        items.map((it) => (
          <Card
            key={it._id}
            onPress={() => navigation.navigate('GrievanceDetail', { ticketId: it.ticketId })}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.ticketId}>{it.ticketId}</Text>
                <Badge label={it.status} color={statusColor(it.status)} soft />
              </View>
              <Text style={styles.title} numberOfLines={1}>{it.optionTitle || it.serviceTitle || 'Grievance'}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {it.location || it.serviceTitle || '—'} · {fmtDate(it.createdAt)}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  ticketId: { ...typography.captionBold, color: colors.brand700, letterSpacing: 0.5 },
  title: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  emptyTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
});
