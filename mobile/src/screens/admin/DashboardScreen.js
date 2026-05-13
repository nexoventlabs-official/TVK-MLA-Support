import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import { Card, StatCard, Badge } from '../../components/Card';
import { colors, spacing, typography, statusColor } from '../../theme';
import * as admin from '../../api/admin';

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [stats, recent] = await Promise.all([
        admin.getDashboardStats().catch(() => ({})),
        admin.getServiceRequests({ limit: 5 }).catch(() => ({})),
      ]);
      const recentList = (recent?.requests || recent?.items || []).slice(0, 5);
      setData({ ...stats, recentRequests: recentList });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const s = data?.stats || {};
  const recent = data?.recentRequests || [];

  return (
    <Screen
      title="Dashboard"
      subtitle="TVK Mylapore"
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.row}>
        <StatCard label="Members" value={String(s.members ?? 0)} helper="Registered & active" />
        <StatCard label="Total Requests" value={String(s.totalRequests ?? 0)} helper="All grievances" />
      </View>
      <View style={[styles.row, { marginTop: spacing.md }]}>
        <StatCard label="New" value={String(s.newRequests ?? 0)} helper="Awaiting triage" accent={colors.statusPending} />
        <StatCard label="Resolved" value={String(s.resolved ?? 0)} helper="Closed" accent={colors.statusCompleted} />
      </View>

      <Text style={styles.sectionTitle}>Status breakdown</Text>
      <Card style={{ gap: spacing.sm }}>
        {Object.entries(data?.statusBreakdown || {}).map(([k, v]) => (
          <View key={k} style={styles.statusRow}>
            <Badge label={k} color={statusColor(k)} soft />
            <Text style={styles.statusCount}>{v}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.sectionTitle}>Recent grievances</Text>
      {recent.length === 0 ? (
        <Card><Text style={styles.empty}>No grievances yet.</Text></Card>
      ) : (
        recent.map((r) => (
          <Card
            key={r._id}
            style={styles.recent}
            onPress={() => navigation.navigate('ServiceRequestDetail', { id: r._id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.recentTitle}>{r.optionTitle || r.serviceTitle}</Text>
              <Text style={styles.recentMeta} numberOfLines={1}>
                {r.ticketId || '—'} · {r.name || r.phone}
              </Text>
            </View>
            <Badge label={r.status} color={statusColor(r.status)} soft />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusCount: { ...typography.bodyBold, color: colors.text, ...typography.tabular },
  recent: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md },
  recentTitle: { ...typography.bodyBold, color: colors.text },
  recentMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
