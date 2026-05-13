import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, Alert, Linking } from 'react-native';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, spacing, typography, radius, statusColor } from '../../theme';
import * as admin from '../../api/admin';

const STATUSES = ['pending', 'accepted', 'processing', 'completed', 'rejected'];

export default function ServiceRequestDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await admin.getServiceRequest(id);
      const it = d?.request || d?.item || d;
      setItem(it);
      setStatus(it.status || 'pending');
      setNotes(it.notes || '');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load ticket');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await admin.updateServiceRequest(id, { status, notes });
      Alert.alert('Updated', 'Ticket updated successfully.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading || !item) return <Screen title="Ticket" loading={loading || !item} />;

  const openMaps = () => {
    if (!item.geo?.latitude) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.geo.latitude},${item.geo.longitude}`);
  };

  const callPhone = () => {
    if (item.phone) Linking.openURL(`tel:${item.phone}`);
  };

  return (
    <Screen title={item.ticketId} subtitle={item.optionTitle || item.serviceTitle}>
      <View style={styles.statusRow}>
        <Badge label={item.status} color={statusColor(item.status)} soft />
        <Text style={styles.created}>{fmtDateTime(item.createdAt)}</Text>
      </View>

      {item.mediaUrls?.length ? (
        <Card style={{ padding: 0, overflow: 'hidden', marginTop: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.mediaUrls.map((u, i) => (
              <Pressable key={i} onPress={() => Linking.openURL(u)}>
                <Image source={{ uri: u }} style={styles.media} />
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Citizen</Text>
        <Field label="Name" value={item.name || '—'} />
        <Pressable onPress={callPhone}>
          <Field label="Phone" value={item.phone || '—'} link />
        </Pressable>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Issue</Text>
        <Field label="Service" value={item.serviceTitle || '—'} />
        <Field label="Type" value={item.optionTitle || '—'} />
        <Field label="Description" value={item.description || '—'} multiline />
        {item.location ? <Field label="Location" value={item.location} /> : null}
        {item.schoolName ? <Field label="School" value={item.schoolName} /> : null}
        {item.geo?.latitude ? (
          <Pressable onPress={openMaps} style={styles.mapButton}>
            <Text style={styles.mapText}>📍 Open in Google Maps</Text>
          </Pressable>
        ) : null}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Update status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUSES.map((s) => (
            <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, status === s && { backgroundColor: statusColor(s), borderColor: statusColor(s) }]}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Input
          label="Internal notes"
          placeholder="Notes visible only to admin team"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
          style={{ marginTop: spacing.sm }}
        />
        <Button label="Save changes" onPress={save} loading={saving} style={{ marginTop: spacing.md }} />
      </Card>
    </Screen>
  );
}

function Field({ label, value, multiline, link }) {
  return (
    <View style={[styles.field, multiline && { flexDirection: 'column', alignItems: 'flex-start' }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, link && { color: colors.brand700, fontWeight: '700' }, multiline && { marginTop: 4 }]}>{value}</Text>
    </View>
  );
}

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  created: { ...typography.caption, color: colors.textMuted },
  media: { width: 240, height: 180 },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  field: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.md },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', width: 90 },
  fieldValue: { ...typography.body, color: colors.text, flex: 1 },
  mapButton: { backgroundColor: colors.brand50, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  mapText: { color: colors.brand700, fontWeight: '700', textAlign: 'center' },
  chips: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipText: { color: colors.textMuted, fontWeight: '700', textTransform: 'capitalize', fontSize: 12 },
  chipTextActive: { color: '#fff' },
});
