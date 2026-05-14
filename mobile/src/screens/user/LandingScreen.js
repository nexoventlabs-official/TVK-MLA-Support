import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';;
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
  const greet = user?.name ? user.name : 'Welcome';

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Custom Profile Header */}
      <View style={styles.topHeader}>
        <Pressable style={styles.avatarWrap} onPress={() => navigation.navigate('ProfileTab')}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{greet}</Text>
          <Text style={styles.subGreetingText}>TVK Mylapore citizen services</Text>
        </View>
      </View>

      {/* Hero CTA — raise a new grievance */}
      <View style={styles.heroWrap}>
        <View style={styles.heroContent}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>PORTAL ACTIVE</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Voice of Mylapore,{'\n'}
            <Text style={{ color: colors.tvkYellow }}>Heard by TVK.</Text>
          </Text>

          <Text style={styles.heroBody}>
            Raise issues directly to MLA Venkatramanan. Track real-time progress.
          </Text>

          <View style={styles.heroActions}>
            <Button
              fullWidth={false}
              label="File a Grievance"
              onPress={() => navigation.navigate('GrievancesTab')}
              style={styles.heroBtn}
              textStyle={styles.heroBtnText}
            />
            <Button
              fullWidth={false}
              label="My Requests"
              variant="secondary"
              onPress={() => navigation.navigate('RequestsTab')}
              style={styles.heroBtnOutline}
              textStyle={{ color: '#fff' }}
            />
          </View>
        </View>

        <Image source={require('../../../assets/mla.png')} style={styles.heroImage} />
      </View>

      {/* Public stats */}
      {stats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{String(stats.totalReceived ?? 0)}</Text>
            <Text style={styles.statLabel}>RECEIVED</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{String(stats.totalResolved ?? 0)}</Text>
            <Text style={styles.statLabel}>RESOLVED</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.avgResponseTime || '—'}</Text>
            <Text style={styles.statLabel}>AVG TIME</Text>
          </View>
        </View>
      )}

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
                  {ev.fromDate ? new Date(ev.fromDate).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                  }) : '—'}
                </Text>
                <Text style={styles.eventTitle} numberOfLines={2}>{ev.title}</Text>
                {ev.location && <Text style={styles.eventVenue} numberOfLines={1}>{ev.location}</Text>}
              </Card>
            ))}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#990000' },
  greetingText: { ...typography.display, color: colors.text, fontSize: 24 },
  subGreetingText: { ...typography.captionBold, color: colors.textMuted, marginTop: 2, letterSpacing: 0.5 },
  heroWrap: {
    backgroundColor: '#990000',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  heroContent: {
    padding: spacing.xl,
    paddingBottom: 160,
    position: 'relative',
    zIndex: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,215,0,0.2)',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' },
  heroBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { ...typography.h1, fontSize: 26, color: '#fff', lineHeight: 32 },
  heroBody: { ...typography.body, color: 'rgba(255,255,255,0.8)', marginTop: spacing.sm, maxWidth: '85%' },
  heroActions: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg },
  heroBtn: { backgroundColor: '#FFD700', borderColor: '#FFD700', paddingHorizontal: spacing.xl },
  heroBtnText: { color: '#990000', fontWeight: '800' },
  heroBtnOutline: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: spacing.xl },
  heroImage: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 260,
    height: 300,
    resizeMode: 'contain',
    zIndex: 1,
    opacity: 1,
  },
  statsBar: {
    backgroundColor: '#FFD700',
    borderRadius: radius.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  statItem: { alignItems: 'center' },
  statValue: { ...typography.display, color: '#990000', fontSize: 28 },
  statLabel: { ...typography.captionBold, color: 'rgba(153,0,0,0.8)', marginTop: 4, letterSpacing: 1 },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  eventCard: { width: 220 },
  eventDate: { ...typography.captionBold, color: colors.brand600, textTransform: 'uppercase' },
  eventTitle: { ...typography.bodyBold, color: colors.text, marginTop: 4 },
  eventVenue: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
