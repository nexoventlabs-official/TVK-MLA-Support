import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';;
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, statusColor, radius } from '../../theme';
import * as admin from '../../api/admin';
import * as portal from '../../api/portal';
import { Feather } from '@expo/vector-icons';
import { thumb } from '../../utils/cloudinary';

export default function MemberDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
      const d = await admin.getMember(id);
      setData(d);
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <Screen title="Member" loading={loading || !data} />;

  const m = data.member || data;
  const requests = data.requests || [];

  return (
    <Screen showBack={true} title={m.name || m.profileName || m.phone} subtitle={m.isRegistered ? 'Registered member' : 'Contact'}>
      <Card>
        <Field label="Phone" value={m.phone} link onPress={() => Linking.openURL(`tel:${m.phone}`)} />
        {m.name && <Field label="Name" value={m.name} />}
        {m.profileName && <Field label="WhatsApp" value={m.profileName} />}
        {m.gender && <Field label="Gender" value={m.gender} />}
        {m.dob && <Field label="DOB" value={new Date(m.dob).toLocaleDateString('en-IN')} />}
        {m.epicNo && <Field label="EPIC" value={m.epicNo} />}
        {m.email && <Field label="Email" value={m.email} />}
        {m.registrationType && <Field label="Source" value={m.registrationType} />}
        {m.registeredAt && <Field label="Joined" value={new Date(m.registeredAt).toLocaleDateString('en-IN')} />}
      </Card>

      <Text style={styles.section}>Grievance history ({requests.length})</Text>
      {requests.length === 0 ? (
        <Card><Text style={styles.empty}>No grievances yet.</Text></Card>
      ) : (
        requests.map((r) => {
          const heroUrl = iconMap[r.optionId] || iconMap[r.serviceId];
          return (
          <Card
            key={r._id}
            onPress={() => navigation.navigate('ServiceRequestDetail', { id: r._id })}
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
                  <Text style={styles.ticketId}>{r.ticketId}</Text>
                  <Badge label={r.status} color={statusColor(r.status)} soft />
                </View>
                <Text style={styles.rowTitle} numberOfLines={1}>{r.optionTitle || r.serviceTitle}</Text>
                <Text style={styles.rowMeta}>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
            </View>
          </Card>
          );
        })
      )}
    </Screen>
  );
}

function Field({ label, value, link, onPress }) {
  const inner = (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, link && { color: colors.brand700, fontWeight: '700' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.md },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', width: 90 },
  fieldValue: { ...typography.body, color: colors.text, flex: 1 },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(153,0,0,0.05)' },
  row: { marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketId: { ...typography.captionBold, color: colors.brand700, letterSpacing: 0.5 },
  rowTitle: { ...typography.bodyBold, color: colors.text, marginTop: 2 },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
