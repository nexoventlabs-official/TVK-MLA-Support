import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography } from '../../theme';
import * as admin from '../../api/admin';

const STATUS_COLORS = {
  draft: colors.textMuted,
  scheduled: colors.statusAccepted,
  sending: colors.statusProcessing,
  completed: colors.statusCompleted,
  failed: colors.red,
};

export default function CampaignsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await admin.getCampaigns();
      setItems(d?.campaigns || d?.items || d || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen
      title="Campaigns"
      subtitle={items.length ? `${items.length} campaign${items.length === 1 ? '' : 's'}` : 'No campaigns'}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      loading={loading}
    >
      {items.length === 0 ? (
        <Card><Text style={styles.empty}>No campaigns yet. Create one from the web admin panel.</Text></Card>
      ) : (
        items.map((c) => (
          <Card key={c._id} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.title} numberOfLines={1}>{c.name || c.title}</Text>
              <Badge label={c.status || 'draft'} color={STATUS_COLORS[c.status] || colors.textMuted} soft />
            </View>
            {c.templateName && <Text style={styles.meta}>Template: {c.templateName}</Text>}
            <Text style={styles.meta}>
              {(c.recipientCount ?? c.recipients?.length ?? 0).toLocaleString('en-IN')} recipients
              {c.sentCount != null && ` · ${c.sentCount} sent`}
              {c.failedCount != null && ` · ${c.failedCount} failed`}
            </Text>
            {c.scheduledAt && <Text style={styles.meta}>Scheduled: {new Date(c.scheduledAt).toLocaleString('en-IN')}</Text>}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.bodyBold, color: colors.text, flex: 1, marginRight: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
