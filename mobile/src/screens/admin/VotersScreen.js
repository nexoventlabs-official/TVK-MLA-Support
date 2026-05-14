import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, radius } from '../../theme';
import * as admin from '../../api/admin';
import { Feather } from '@expo/vector-icons';

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
    <Screen showBack={true} title="Voters List">

      <Input
        placeholder="Search by name, EPIC, house no…"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={() => load(1)}
      />
      <View style={{ height: spacing.lg }} />

      {items.length === 0 ? (
        <Card><Text style={styles.empty}>{loading ? 'Loading…' : 'Enter a search term to find voters.'}</Text></Card>
      ) : (
        items.map((v) => (
          <Card
            key={v._id || v.epicNo}
            onPress={() => navigation.navigate('VoterDetail', { id: v._id || v.epicNo })}
            style={styles.card}
          >
            <View style={styles.iconBox}>
              <Feather name="user" size={20} color={colors.brand700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{v.name || '—'}</Text>
              <Text style={styles.meta}>{v.gender} · House {v.houseNo || '—'}</Text>
              {v.assemblyName && <Text style={styles.meta}>{v.assemblyName} ({v.assemblyNo})</Text>}
            </View>
            <Badge label={v.epicNo} color={colors.brand700} soft />
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
  header: { marginBottom: spacing.lg },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,215,0,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  headerBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { ...typography.h1, fontSize: 28, color: colors.text },
  
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.md },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(153,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
