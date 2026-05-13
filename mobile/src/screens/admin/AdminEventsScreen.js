import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, radius } from '../../theme';
import * as admin from '../../api/admin';

export default function AdminEventsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await admin.getAdminEvents();
      setItems(d?.events || d?.items || d || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen
      title="Events"
      subtitle="Manage upcoming events"
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      loading={loading}
    >
      {items.length === 0 ? (
        <Card><Text style={styles.empty}>No events. Create one from the web admin panel.</Text></Card>
      ) : (
        items.map((ev) => (
          <Card key={ev._id} style={{ marginBottom: spacing.sm, padding: 0, overflow: 'hidden' }}>
            {ev.imageUrl ? (
              <Image source={{ uri: ev.imageUrl }} style={styles.cover} />
            ) : null}
            <View style={{ padding: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                <Badge label={ev.active ? 'Active' : 'Hidden'} color={ev.active ? colors.statusCompleted : colors.textMuted} soft />
                <Text style={styles.date}>{ev.fromDate ? new Date(ev.fromDate).toLocaleDateString('en-IN') : ''}</Text>
              </View>
              <Text style={styles.title}>{ev.title}</Text>
              {ev.venue && <Text style={styles.meta} numberOfLines={1}>📍 {ev.venue}</Text>}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 140, backgroundColor: colors.brand50 },
  date: { ...typography.captionBold, color: colors.brand600, textTransform: 'uppercase' },
  title: { ...typography.h3, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
