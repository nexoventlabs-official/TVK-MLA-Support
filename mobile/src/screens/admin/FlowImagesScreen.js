import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, FlatList } from 'react-native';
import Screen from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, spacing, typography, radius } from '../../theme';
import * as admin from '../../api/admin';

export default function FlowImagesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await admin.getFlowImages();
      setItems(d?.images || d?.items || d || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen
      title="Flow Images"
      subtitle="WhatsApp + portal media library"
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      loading={loading}
    >
      <View style={styles.grid}>
        {items.map((img) => (
          <Card key={img._id || img.key} style={styles.tile}>
            {img.url ? (
              <Image source={{ uri: img.url }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Text style={styles.emptyIcon}>🖼️</Text>
              </View>
            )}
            <Text style={styles.key} numberOfLines={2}>{img.key}</Text>
            {img.description ? <Text style={styles.desc} numberOfLines={2}>{img.description}</Text> : null}
          </Card>
        ))}
      </View>
      {items.length === 0 && !loading && (
        <Card><Text style={styles.empty}>No flow images configured.</Text></Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', padding: spacing.sm },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.brand50, marginBottom: spacing.sm },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 32 },
  key: { ...typography.captionBold, color: colors.text },
  desc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
