import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';;
import Screen from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, spacing, typography, radius } from '../../theme';
import * as portal from '../../api/portal';
import { thumb } from '../../utils/cloudinary';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await portal.getEvents();
      setEvents(d?.events || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen
      title="Upcoming Events"
      subtitle={events.length ? `${events.length} event${events.length === 1 ? '' : 's'}` : 'Stay tuned'}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      {events.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No upcoming events right now.</Text>
        </Card>
      ) : (
        events.map((ev) => (
          <Card
            key={ev._id}
            onPress={() => navigation.navigate('EventDetail', { id: ev._id })}
            style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}
          >
            {ev.image ? (
              <Image source={{ uri: thumb(ev.image, 800) }} style={styles.cover} contentFit="contain" />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={styles.coverEmoji}>📅</Text>
              </View>
            )}
            <View style={{ padding: spacing.lg }}>
              <Text style={styles.date}>{fmtRange(ev.fromDate, ev.toDate)}</Text>
              <Text style={styles.title}>{ev.title}</Text>
              {ev.location ? <Text style={styles.venue} numberOfLines={1}>📍 {ev.location}</Text> : null}
              {ev.description ? <Text style={styles.summary} numberOfLines={2}>{ev.description}</Text> : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function fmtRange(from, to) {
  if (!from) return '';
  const a = new Date(from);
  const b = to ? new Date(to) : null;
  const optsDay = { day: '2-digit', month: 'short' };
  const optsFull = { day: '2-digit', month: 'short', year: 'numeric' };
  if (!b || a.toDateString() === b.toDateString()) {
    return a.toLocaleDateString('en-IN', optsFull);
  }
  return `${a.toLocaleDateString('en-IN', optsDay)} – ${b.toLocaleDateString('en-IN', optsFull)}`;
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  cover: { width: '100%', height: 160, backgroundColor: colors.brand50 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 64 },
  date: { ...typography.captionBold, color: colors.brand600, textTransform: 'uppercase' },
  title: { ...typography.h2, color: colors.text, marginTop: 4 },
  venue: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  summary: { ...typography.body, color: colors.text, marginTop: spacing.sm },
});
