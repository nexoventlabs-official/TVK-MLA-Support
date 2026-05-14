import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';;
import Screen from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, spacing, typography, radius } from '../../theme';
import * as portal from '../../api/portal';
import { thumb } from '../../utils/cloudinary';

export default function EventDetailScreen({ route }) {
  const { id } = route.params;
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await portal.getEvent(id);
      setEv(d?.event || null);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !ev) return <Screen title="Event" loading={loading || !ev} />;

  const openMaps = () => {
    if (ev.location) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`);
    }
  };

  return (
    <Screen
      showBack={true}
      title="Event"
      padded={false}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      {ev.image ? (
        <Image source={{ uri: thumb(ev.image, 1200) }} style={styles.cover} contentFit="contain" />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.coverEmoji}>📅</Text>
        </View>
      )}
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.date}>{fmtRange(ev.fromDate, ev.toDate)}</Text>
        <Text style={styles.title}>{ev.title}</Text>

        {ev.location ? (
          <Pressable onPress={openMaps} style={styles.venueRow}>
            <Text style={styles.venue}>📍 {ev.location}</Text>
            <Text style={styles.venueLink}>Open in Maps ›</Text>
          </Pressable>
        ) : null}

        {ev.description ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.body}>{ev.description}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function fmtRange(from, to) {
  if (!from) return '';
  const a = new Date(from);
  const b = to ? new Date(to) : null;
  const optsFull = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  if (!b || a.toDateString() === b.toDateString()) return a.toLocaleString('en-IN', optsFull);
  return `${a.toLocaleString('en-IN', optsFull)} – ${b.toLocaleString('en-IN', optsFull)}`;
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 240, backgroundColor: colors.brand50 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 80 },
  date: { ...typography.captionBold, color: colors.brand600, textTransform: 'uppercase' },
  title: { ...typography.display, fontSize: 24, color: colors.text, marginTop: 4 },
  venueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingVertical: spacing.sm },
  venue: { ...typography.body, color: colors.text, flex: 1 },
  venueLink: { ...typography.captionBold, color: colors.brand700 },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.text, lineHeight: 22 },
});
