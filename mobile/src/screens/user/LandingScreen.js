import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Screen from '../../components/Screen';
import { Card, StatCard } from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, typography, radius } from '../../theme';
import * as portal from '../../api/portal';

export default function LandingScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        portal.getPortalStats().catch(() => null),
        portal.getEvents().catch(() => ({ events: [] })),
      ]);
      setStats(s?.stats || s);
      setEvents(e?.events || e || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };
  const greet = user?.name ? `Vanakkam, ${user.name.split(' ')[0]} 🙏` : 'Vanakkam 🙏';

  return (
    <Screen
      title={greet}
      subtitle="TVK Mylapore citizen services"
      refreshing={refreshing}
      onRefresh={onRefresh}
      loading={loading}
    >
      {/* Hero CTA — raise a new grievance */}
      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>Need help with a civic issue?</Text>
        <Text style={styles.heroBody}>
          Raise a grievance in under a minute. Attach a photo + your location and we'll dispatch a field team.
        </Text>
        <Button
          label="Raise a Grievance"
          onPress={() => navigation.navigate('NewGrievance')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Public stats */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard
            label="Received"
            value={String(stats.totalReceived ?? 0)}
            helper="Total grievances"
          />
          <StatCard
            label="Resolved"
            value={String(stats.totalResolved ?? 0)}
            helper="Closed successfully"
            accent={colors.statusCompleted}
          />
        </View>
      )}
      {stats?.avgResponseTime && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.metricLabel}>Avg. response time</Text>
          <Text style={styles.metricValue}>{stats.avgResponseTime}</Text>
        </Card>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.actionsGrid}>
        <ActionTile
          label="My Grievances"
          helper="Track your tickets"
          onPress={() => navigation.navigate('MyGrievances')}
        />
        <ActionTile
          label="Events"
          helper="Upcoming TVK events"
          onPress={() => navigation.navigate('Events')}
        />
      </View>

      {/* Upcoming events preview */}
      {events.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming events</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {events.slice(0, 5).map((ev) => (
              <Card
                key={ev._id || ev.id}
                onPress={() => navigation.navigate('EventDetail', { id: ev._id || ev.id })}
                style={styles.eventCard}
              >
                <Text style={styles.eventDate}>
                  {ev.startsAt ? new Date(ev.startsAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                  }) : '—'}
                </Text>
                <Text style={styles.eventTitle} numberOfLines={2}>{ev.title}</Text>
                {ev.venue && <Text style={styles.eventVenue} numberOfLines={1}>{ev.venue}</Text>}
              </Card>
            ))}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

function ActionTile({ label, helper, onPress }) {
  return (
    <Card onPress={onPress} style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileHelper}>{helper}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.brand800,
    borderColor: colors.brand800,
  },
  heroTitle: { ...typography.h2, color: '#fff' },
  heroBody: { ...typography.body, color: colors.brand100, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metricLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase' },
  metricValue: { ...typography.h1, color: colors.brand700, marginTop: 4 },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  actionsGrid: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  tileLabel: { ...typography.bodyBold, color: colors.text },
  tileHelper: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  eventCard: { width: 220 },
  eventDate: { ...typography.captionBold, color: colors.brand600, textTransform: 'uppercase' },
  eventTitle: { ...typography.bodyBold, color: colors.text, marginTop: 4 },
  eventVenue: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
