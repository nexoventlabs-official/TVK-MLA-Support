import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';;
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, statusColor, radius } from '../../theme';
import * as admin from '../../api/admin';
import * as portal from '../../api/portal';
import { Feather } from '@expo/vector-icons';
import { thumb } from '../../utils/cloudinary';

export default function VoterDetailScreen({ route, navigation }) {
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
      const d = await admin.getVoter(id);
      setData(d);
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <Screen title="Voter" loading={loading || !data} />;

  const v = data.voter || data;
  const member = data.member;
  const requests = data.requests || [];

  return (
    <Screen showBack={true}>
      {/* Centered Hero Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{v.name ? v.name.charAt(0).toUpperCase() : 'V'}</Text>
        </View>
        <Text style={styles.nameText}>{v.name || 'Voter'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{v.epicNo}</Text>
        </View>
      </View>

      <Card style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {v.relationName && <Field icon="users" label={v.relationType || 'Relation'} value={v.relationName} />}
        <Field icon="user" label="Gender" value={v.gender} />
        <Field icon="home" label="House" value={v.houseNo} />
        {v.assemblyName && <Field icon="map-pin" label="Assembly" value={`${v.assemblyName} (${v.assemblyNo})`} />}
        {v.mobile && <Field icon="phone" label="Mobile" value={v.mobile} />}
      </Card>

      {member && (
        <>
          <Text style={styles.sectionTitle}>TVK Member Account</Text>
          <Card style={{ gap: spacing.md }}>
            <Field icon="smartphone" label="Phone" value={member.phone} />
            {member.registeredAt && <Field icon="calendar" label="Joined" value={new Date(member.registeredAt).toLocaleDateString('en-IN')} />}
          </Card>
        </>
      )}

      {requests.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Grievances</Text>
            <Badge label={String(requests.length)} color={colors.brand700} soft />
          </View>
          {requests.map((r) => {
            const heroUrl = iconMap[r.optionId] || iconMap[r.serviceId];
            return (
            <Card
              key={r._id}
              onPress={() => navigation.navigate('ServiceRequestDetail', { id: r._id })}
              style={{ marginBottom: spacing.sm }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {heroUrl ? (
                  <Image source={{ uri: thumb(heroUrl, 120) }} style={styles.requestIconBox} contentFit="cover" />
                ) : (
                  <View style={[styles.requestIconBox, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Feather name="file-text" size={20} color={colors.brand700} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.ticket}>{r.ticketId}</Text>
                    <Badge label={r.status} color={statusColor(r.status)} soft />
                  </View>
                  <Text style={styles.rowTitle}>{r.optionTitle || r.serviceTitle}</Text>
                </View>
              </View>
            </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function Field({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Feather name={icon} size={18} color={colors.brand700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { height: 4 } },
      android: { elevation: 8 }
    }),
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#990000' },
  nameText: { ...typography.h1, fontSize: 26, color: colors.text, marginBottom: spacing.xs },
  roleBadge: {
    backgroundColor: 'rgba(153,0,0,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: { ...typography.captionBold, color: '#990000', letterSpacing: 1 },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(153,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase' },
  value: { ...typography.bodyBold, color: colors.text, marginTop: 2 },
  
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  requestIconBox: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(153,0,0,0.05)' },
  ticket: { ...typography.captionBold, color: colors.brand700 },
  rowTitle: { ...typography.bodyBold, color: colors.text, marginTop: 4 },
});
