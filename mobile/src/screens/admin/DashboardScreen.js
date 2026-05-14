import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';;
import { Feather } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, radius, statusColor } from '../../theme';
import { DonutChart, DonutLegend, HBarChart, LineChart, Heatmap } from '../../components/Charts';
import * as admin from '../../api/admin';
import * as portal from '../../api/portal';
import { thumb } from '../../utils/cloudinary';

/**
 * Admin Dashboard — mirrors the web frontend's Dashboard.jsx with stat
 * cards, status donut, service distribution, daily timeline, weekday ×
 * hour heatmap, and recent items. Polls every 15s in the background.
 */

const STATUS_VIZ = {
  pending:    { label: 'Pending',    color: '#f59e0b' },
  accepted:   { label: 'Accepted',   color: '#0ea5e9' },
  processing: { label: 'Processing', color: '#3b82f6' },
  completed:  { label: 'Completed',  color: '#10b981' },
  rejected:   { label: 'Rejected',   color: '#a1a1aa' },
};

const SERVICE_PALETTE = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState({
    stats: {},
    byService: [],
    timeline: [],
    memberGrowth: [],
    heatmap: [],
    statusBreakdown: {},
    recentRequests: [],
    recentMembers: [],
    meta: { timelineDays: 30, heatmapDays: 60 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [iconMap, setIconMap] = useState({});

  useEffect(() => {
    portal.getServices().then((d) => {
      const map = {};
      (d?.services || []).forEach(s => {
        if (s.iconUrl) map[s.id] = s.iconUrl;
        (s.options || []).forEach(o => {
          if (o.iconUrl) map[o.id] = o.iconUrl;
        });
      });
      setIconMap(map);
    }).catch(() => {});
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = await admin.getDashboardStats();
      setData((prev) => ({ ...prev, ...d }));
    } catch {} finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(t);
  }, [load]);

  const screenW = Dimensions.get('window').width;
  const chartW = Math.min(screenW - spacing.lg * 4, 360);

  // Status donut data
  const statusData = useMemo(() => {
    return Object.entries(STATUS_VIZ).map(([k, v]) => ({
      key: k,
      label: v.label,
      color: v.color,
      value: data.statusBreakdown?.[k] || 0,
    }));
  }, [data.statusBreakdown]);

  const totalRequests = data.stats?.totalRequests || 0;

  // Service distribution data — keep top 8, paint with palette
  const serviceData = useMemo(() => {
    const arr = (data.byService || []).map((s, i) => ({
      label: s.title,
      value: s.count,
      color: SERVICE_PALETTE[i % SERVICE_PALETTE.length],
    }));
    return arr.sort((a, b) => b.value - a.value);
  }, [data.byService]);

  return (
    <Screen
      title="Dashboard"
      subtitle={
        <View style={styles.subtitleRow}>
          <View style={styles.liveDot}><View style={styles.liveDotInner} /></View>
          <Text style={styles.subtitleText}>Live · refreshes every 15s</Text>
        </View>
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      {/* Stat cards */}
      <View style={styles.statGrid}>
        <StatCard icon="users" label="Members" value={data.stats?.members} />
        <StatCard icon="clipboard" label="Requests" value={data.stats?.totalRequests} />
        <StatCard icon="alert-circle" label="New" value={data.stats?.newRequests} accent="#f59e0b" />
        <StatCard icon="check-circle" label="Resolved" value={data.stats?.resolved} accent="#10b981" />
      </View>

      {/* Status donut */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Feather name="pie-chart" size={14} color={colors.brand700} />
          <Text style={styles.cardTitle}>Request Status</Text>
        </View>
        {totalRequests === 0 ? (
          <Text style={styles.empty}>No requests yet.</Text>
        ) : (
          <>
            <DonutChart
              data={statusData}
              size={Math.min(chartW, 200)}
              thickness={28}
              hideCenter
            />
            <DonutLegend data={statusData} />
          </>
        )}
      </Card>

      {/* Service distribution */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Feather name="bar-chart-2" size={14} color={colors.brand700} />
          <Text style={styles.cardTitle}>Requests by Service</Text>
        </View>
        <HBarChart data={serviceData} />
      </Card>

      {/* Timeline */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Feather name="trending-up" size={14} color={colors.brand700} />
          <Text style={styles.cardTitle}>Last {data.meta?.timelineDays || 30} days</Text>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <LineChart data={data.timeline} width={chartW} height={120} color="#dc2626" />
        </View>
        <View style={styles.tlSplit}>
          <Text style={styles.tlSplitLabel}>Member sign-ups</Text>
          <LineChart data={data.memberGrowth} width={chartW} height={80} color="#3b82f6" />
        </View>
      </Card>

      {/* Heatmap */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Feather name="grid" size={14} color={colors.brand700} />
          <Text style={styles.cardTitle}>When Requests Come In</Text>
        </View>
        <Text style={styles.cardSub}>Last {data.meta?.heatmapDays || 60} days · IST · Mon→Sun × 0–23h</Text>
        <View style={{ marginTop: spacing.md }}>
          <Heatmap cells={data.heatmap} width={chartW} />
        </View>
      </Card>

      {/* Recent requests */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Feather name="inbox" size={14} color={colors.brand700} />
          <Text style={styles.cardTitle}>Recent Requests</Text>
        </View>
        {(data.recentRequests || []).length === 0 ? (
          <Text style={styles.empty}>No recent requests.</Text>
        ) : (
          (data.recentRequests || []).slice(0, 5).map((r, index, arr) => {
            const heroUrl = iconMap[r.optionId] || iconMap[r.serviceId];
            return (
            <Pressable
              key={r._id}
              onPress={() => navigation.navigate('ServiceRequestDetail', { id: r._id })}
              style={[styles.recentRow, index === arr.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}
            >
              {heroUrl ? (
                <Image source={{ uri: thumb(heroUrl, 120) }} style={styles.iconBox} contentFit="cover" />
              ) : (
                <View style={[styles.iconBox, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Feather name="file-text" size={20} color={colors.brand700} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.recentRowTop}>
                  <Text style={styles.recentTicketId}>{r.ticketId}</Text>
                  <Badge label={r.status} color={statusColor(r.status)} soft />
                </View>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {r.optionTitle || r.serviceTitle || 'Request'}
                </Text>
                <Text style={styles.recentMeta} numberOfLines={1}>
                  {r.name || r.phone} · {new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            </Pressable>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

function StatCard({ icon, label, value = 0, accent }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, accent && { backgroundColor: accent + '15' }]}>
        <Feather name={icon} size={16} color={accent || colors.brand700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{Number(value || 0).toLocaleString('en-IN')}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b98140', alignItems: 'center', justifyContent: 'center' },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  subtitleText: { ...typography.caption, color: colors.textMuted },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card || '#fff',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: spacing.md,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.brand50,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { ...typography.h2, color: colors.text, ...(typography.tabular || {}) },
  statLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  cardSub: { ...typography.caption, color: colors.textMuted },

  tlSplit: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tlSplitLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },

  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },

  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  recentRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(153,0,0,0.05)' },
  recentTicketId: { ...typography.captionBold, color: colors.brand700, letterSpacing: 0.5 },
  recentTitle: { ...typography.bodyBold, color: colors.text },
  recentMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
