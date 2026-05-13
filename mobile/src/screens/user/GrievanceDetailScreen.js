import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Linking, Pressable } from 'react-native';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, radius, statusColor } from '../../theme';
import * as portal from '../../api/portal';

export default function GrievanceDetailScreen({ route }) {
  const { ticketId } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await portal.getMyGrievance(ticketId);
      setItem(d?.request || null);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !item) {
    return <Screen title="Grievance" loading={loading || !item} />;
  }

  const openMaps = () => {
    if (!item.geo?.latitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${item.geo.latitude},${item.geo.longitude}`;
    Linking.openURL(url);
  };

  return (
    <Screen
      title={item.ticketId}
      subtitle={item.optionTitle || item.serviceTitle}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <View style={styles.statusRow}>
        <Badge label={item.status} color={statusColor(item.status)} soft />
        <Text style={styles.created}>{fmtDateTime(item.createdAt)}</Text>
      </View>

      {item.mediaUrls?.length ? (
        <Card style={{ padding: 0, overflow: 'hidden', marginTop: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.mediaUrls.map((u, i) => (
              <Image key={i} source={{ uri: u }} style={styles.media} />
            ))}
          </ScrollView>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <Field label="Service" value={item.serviceTitle} />
        <Field label="Issue" value={item.optionTitle} />
        <Field label="Description" value={item.description || '—'} multiline />
        {item.location ? <Field label="Location" value={item.location} /> : null}
        {item.schoolName ? <Field label="School" value={item.schoolName} /> : null}
        {item.geo?.latitude ? (
          <Pressable onPress={openMaps} style={styles.mapButton}>
            <Text style={styles.mapText}>📍 Open in Google Maps ({item.geo.latitude.toFixed(4)}, {item.geo.longitude.toFixed(4)})</Text>
          </Pressable>
        ) : null}
      </Card>

      {item.notes ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Admin notes</Text>
          <Text style={styles.notes}>{item.notes}</Text>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <TimelineRow label="Submitted" date={item.createdAt} done />
        <TimelineRow label="Last updated" date={item.updatedAt} done={item.updatedAt !== item.createdAt} />
        {item.status === 'completed' && <TimelineRow label="Resolved" date={item.updatedAt} done />}
      </Card>
    </Screen>
  );
}

function Field({ label, value, multiline }) {
  return (
    <View style={[styles.field, multiline && { flexDirection: 'column', alignItems: 'flex-start' }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, multiline && { marginTop: 4 }]}>{value}</Text>
    </View>
  );
}

function TimelineRow({ label, date, done }) {
  return (
    <View style={styles.tlRow}>
      <View style={[styles.tlDot, done && styles.tlDotDone]} />
      <Text style={styles.tlLabel}>{label}</Text>
      <Text style={styles.tlDate}>{date ? fmtDateTime(date) : '—'}</Text>
    </View>
  );
}

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  created: { ...typography.caption, color: colors.textMuted },
  media: { width: 240, height: 180 },
  field: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.md },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', width: 90 },
  fieldValue: { ...typography.body, color: colors.text, flex: 1 },
  mapButton: { backgroundColor: colors.brand50, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  mapText: { color: colors.brand700, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  notes: { ...typography.body, color: colors.text },
  tlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, marginRight: spacing.md },
  tlDotDone: { backgroundColor: colors.brand600 },
  tlLabel: { ...typography.body, color: colors.text, flex: 1 },
  tlDate: { ...typography.caption, color: colors.textMuted, ...typography.tabular },
});
