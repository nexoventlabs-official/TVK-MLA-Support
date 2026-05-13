import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Screen from '../../components/Screen';
import Input from '../../components/Input';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, typography, radius } from '../../theme';
import * as admin from '../../api/admin';

export default function MembersScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [onlyRegistered, setOnlyRegistered] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (onlyRegistered) params.registered = '1';
      const d = await admin.getMembers(params);
      setItems(d?.members || d?.items || d || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [q, onlyRegistered]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen
      title="Members"
      subtitle={items.length ? `${items.length} contact${items.length === 1 ? '' : 's'}` : 'No members'}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <Input
        placeholder="Search by phone, name, EPIC, email…"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={load}
      />
      <View style={{ flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm }}>
        <Pressable onPress={() => setOnlyRegistered(false)} style={[styles.chip, !onlyRegistered && styles.chipActive]}>
          <Text style={[styles.chipText, !onlyRegistered && styles.chipTextActive]}>All</Text>
        </Pressable>
        <Pressable onPress={() => setOnlyRegistered(true)} style={[styles.chip, onlyRegistered && styles.chipActive]}>
          <Text style={[styles.chipText, onlyRegistered && styles.chipTextActive]}>Registered only</Text>
        </Pressable>
      </View>

      <View style={{ height: spacing.md }} />

      {loading ? null : items.length === 0 ? (
        <Card><Text style={styles.empty}>No matching members.</Text></Card>
      ) : (
        items.map((m) => (
          <Card
            key={m._id}
            onPress={() => navigation.navigate('MemberDetail', { id: m._id })}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.title} numberOfLines={1}>{m.name || m.profileName || m.phone}</Text>
                {m.isRegistered && <Badge label="Registered" color={colors.brand600} soft />}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {m.phone}{m.epicNo ? ` · ${m.epicNo}` : ''}{m.requestCount ? ` · ${m.requestCount} tickets` : ''}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipActive: { borderColor: colors.brand700, backgroundColor: colors.brand700 },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  row: { marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
