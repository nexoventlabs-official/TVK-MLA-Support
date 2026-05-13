import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme';
import * as admin from '../../api/admin';

export default function VotersScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const d = await admin.getVoters({ q: q.trim(), page: pageNum, limit: 50 });
      const list = d?.voters || d?.items || d || [];
      setItems(pageNum === 1 ? list : [...items, ...list]);
      setHasMore(list.length === 50);
      setPage(pageNum);
    } catch {} finally { setLoading(false); }
  }, [q, items]);

  useEffect(() => { load(1); }, []);

  return (
    <Screen title="Voters" subtitle="Read-only voter roll">
      <Input
        placeholder="Search by name, EPIC, house no…"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={() => load(1)}
      />
      <View style={{ height: spacing.md }} />

      {items.length === 0 ? (
        <Card><Text style={styles.empty}>{loading ? 'Loading…' : 'Enter a search term to find voters.'}</Text></Card>
      ) : (
        items.map((v) => (
          <Card
            key={v._id || v.epicNo}
            onPress={() => navigation.navigate('VoterDetail', { id: v._id || v.epicNo })}
            style={styles.row}
          >
            <Text style={styles.name}>{v.name || '—'}</Text>
            <Text style={styles.meta}>{v.epicNo} · {v.gender} · House {v.houseNo || '—'}</Text>
            {v.assemblyName && <Text style={styles.meta}>{v.assemblyName} ({v.assemblyNo})</Text>}
          </Card>
        ))
      )}

      {hasMore && (
        <Button label="Load more" variant="secondary" onPress={() => load(page + 1)} loading={loading} style={{ marginTop: spacing.md }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  name: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
