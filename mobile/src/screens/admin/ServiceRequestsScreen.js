import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Screen from '../../components/Screen';
import Input from '../../components/Input';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, radius, statusColor } from '../../theme';
import * as admin from '../../api/admin';

const STATUSES = ['all', 'pending', 'accepted', 'processing', 'completed', 'rejected'];

export default function ServiceRequestsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status !== 'all') params.status = status;
      if (q.trim()) params.q = q.trim();
      const d = await admin.getServiceRequests(params);
      setItems(d?.requests || d?.items || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [status, q]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen
      title="Service Requests"
      subtitle={items.length ? `${items.length} ticket${items.length === 1 ? '' : 's'}` : 'No tickets'}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <Input
        placeholder="Search by ticket ID, name, phone…"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={load}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {STATUSES.map((s) => (
          <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipActive]}>
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? null : items.length === 0 ? (
        <Card><Text style={styles.empty}>No matching tickets.</Text></Card>
      ) : (
        items.map((it) => (
          <Card
            key={it._id}
            onPress={() => navigation.navigate('ServiceRequestDetail', { id: it._id })}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.ticketId}>{it.ticketId}</Text>
                <Badge label={it.status} color={statusColor(it.status)} soft />
              </View>
              <Text style={styles.title} numberOfLines={1}>{it.optionTitle || it.serviceTitle}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {it.name || it.phone} · {fmtDate(it.createdAt)}
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
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingVertical: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipActive: { borderColor: colors.brand700, backgroundColor: colors.brand700 },
  chipText: { color: colors.textMuted, fontWeight: '700', textTransform: 'capitalize', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  row: { marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  ticketId: { ...typography.captionBold, color: colors.brand700, letterSpacing: 0.5 },
  title: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
