import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';;
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import Button from '../../components/Button';
import { colors, spacing, typography, statusColor, radius } from '../../theme';
import * as portal from '../../api/portal';
import { Feather } from '@expo/vector-icons';
import { thumb } from '../../utils/cloudinary';

export default function MyGrievancesScreen({ navigation }) {
  const [items, setItems] = useState([]);
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
      title="My Requests"
      subtitle={items.length ? `${items.length} request${items.length === 1 ? '' : 's'}` : 'Track your grievances'}
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
            onPress={() => navigation.getParent()?.navigate('GrievancesTab')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        items.map((it) => {
          const heroUrl = iconMap[it.optionId] || iconMap[it.serviceId];
          return (
          <Card
            key={it._id}
            onPress={() => navigation.navigate('GrievanceDetail', { ticketId: it.ticketId })}
            style={styles.row}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {heroUrl ? (
                <Image source={{ uri: thumb(heroUrl, 120) }} style={styles.iconBox} contentFit="cover" />
              ) : (
                <View style={[styles.iconBox, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Feather name="file-text" size={20} color={colors.brand700} />
                </View>
              )}
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
            </View>
          </Card>
          );
        })
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
  iconBox: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(153,0,0,0.05)' },
  ticketId: { ...typography.captionBold, color: colors.brand700, letterSpacing: 0.5 },
  title: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  emptyTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
});
