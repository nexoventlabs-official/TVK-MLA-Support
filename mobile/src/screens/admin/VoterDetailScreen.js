import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, statusColor } from '../../theme';
import * as admin from '../../api/admin';

export default function VoterDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <Screen title={v.name || 'Voter'} subtitle={v.epicNo}>
      <Card>
        <Field label="Name" value={v.name} />
        <Field label="EPIC" value={v.epicNo} />
        {v.relationName && <Field label={v.relationType || 'Relation'} value={v.relationName} />}
        <Field label="Gender" value={v.gender} />
        <Field label="House" value={v.houseNo} />
        {v.assemblyName && <Field label="Assembly" value={`${v.assemblyName} (${v.assemblyNo})`} />}
        {v.mobile && <Field label="Mobile" value={v.mobile} />}
      </Card>

      {member && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.section}>TVK Member Account</Text>
          <Field label="Phone" value={member.phone} />
          {member.registeredAt && <Field label="Joined" value={new Date(member.registeredAt).toLocaleDateString('en-IN')} />}
        </Card>
      )}

      {requests.length > 0 && (
        <>
          <Text style={styles.section}>Grievances ({requests.length})</Text>
          {requests.map((r) => (
            <Card
              key={r._id}
              onPress={() => navigation.navigate('ServiceRequestDetail', { id: r._id })}
              style={{ marginBottom: spacing.sm }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.ticket}>{r.ticketId}</Text>
                <Badge label={r.status} color={statusColor(r.status)} soft />
              </View>
              <Text style={styles.rowTitle}>{r.optionTitle || r.serviceTitle}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.md },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', width: 90 },
  fieldValue: { ...typography.body, color: colors.text, flex: 1 },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  ticket: { ...typography.captionBold, color: colors.brand700 },
  rowTitle: { ...typography.bodyBold, color: colors.text, marginTop: 4 },
});
