import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';;
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, spacing, typography, radius } from '../../theme';
import * as admin from '../../api/admin';

/**
 * Admin Events screen with full CRUD — mirrors the web frontend's Events
 * page (frontend/src/pages/Events.jsx). Lists events, lets the admin
 * create/edit/delete via a modal form, picks an image with the native
 * picker, and silently refreshes every 20s while open.
 */
export default function AdminEventsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = await admin.getAdminEvents();
      setItems(d?.events || d?.items || []);
    } catch {} finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load({ silent: true }), 20000);
    return () => clearInterval(t);
  }, [load]);

  const remove = (ev) => {
    Alert.alert(
      'Delete event',
      `Delete "${ev.title}"? It will be removed from the WhatsApp flow.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await admin.deleteEvent(ev._id);
              load();
            } catch (e) {
              Alert.alert('Could not delete', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen
      showBack
      title="Events"
      subtitle={`${items.length} event${items.length === 1 ? '' : 's'}`}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      rightAction={
        <Pressable onPress={() => { setEditing(null); setShowForm(true); }} style={styles.fab} hitSlop={10}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      }
    >
      {items.length === 0 ? (
        <Card><Text style={styles.empty}>No events yet. Tap + to create one.</Text></Card>
      ) : (
        items.map((ev) => {
          const past = new Date(ev.toDate).getTime() < Date.now();
          return (
            <Card key={ev._id} style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
              {ev.image ? (
                <Image source={{ uri: ev.image }} style={styles.cover} contentFit="cover" />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <Feather name="image" size={32} color={colors.brand300} />
                </View>
              )}
              <View style={{ padding: spacing.lg }}>
                <View style={styles.metaRow}>
                  <Badge label={ev.active ? 'Active' : 'Hidden'} color={ev.active ? colors.statusCompleted : colors.textMuted} soft />
                  {past && <Badge label="Past" color={colors.amber || '#f59e0b'} soft />}
                </View>
                <Text style={styles.title}>{ev.title}</Text>
                <Text style={styles.dates}>{fmtRange(ev.fromDate, ev.toDate)}</Text>
                {ev.location ? <Text style={styles.metaText} numberOfLines={1}><Feather name="map-pin" size={12} color={colors.textMuted} />  {ev.location}</Text> : null}
                {ev.description ? <Text style={styles.desc} numberOfLines={2}>{ev.description}</Text> : null}
                <View style={styles.actions}>
                  <Button
                    label="Edit"
                    icon={<Feather name="edit-2" size={14} color={colors.text} />}
                    variant="secondary"
                    size="sm"
                    onPress={() => { setEditing(ev); setShowForm(true); }}
                    style={{ flex: 1 }}
                  />
                  <View style={{ width: spacing.sm }} />
                  <Button
                    label=""
                    icon={<Feather name="trash-2" size={14} color="#fff" />}
                    variant="danger"
                    size="sm"
                    onPress={() => remove(ev)}
                    fullWidth={false}
                    style={{ paddingHorizontal: spacing.md }}
                  />
                </View>
              </View>
            </Card>
          );
        })
      )}

      {showForm && (
        <EventFormModal
          ev={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </Screen>
  );
}

/* ──────────────── Modal form ──────────────── */

const blank = { title: '', description: '', location: '', fromDate: '', toDate: '', active: true };

function EventFormModal({ ev, onClose, onSaved }) {
  const [form, setForm] = useState(() => (
    ev
      ? {
          title: ev.title || '',
          description: ev.description || '',
          location: ev.location || '',
          fromDate: toDateInput(ev.fromDate),
          toDate: toDateInput(ev.toDate),
          active: !!ev.active,
        }
      : blank
  ));
  const [imageFile, setImageFile] = useState(null);
  const [existingImage] = useState(ev?.image || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access to choose an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [16, 9],
      });
      if (result.canceled) return;
      const a = result.assets[0];
      setImageFile({
        uri: a.uri,
        name: a.fileName || `event_${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
      });
    } catch (e) {
      Alert.alert('Could not pick image', e.message);
    }
  };

  const submit = async () => {
    if (!form.title.trim()) return setError('Title is required');
    if (!form.fromDate || !form.toDate) return setError('From & To dates are required (YYYY-MM-DD)');
    if (!isValidDate(form.fromDate)) return setError('Invalid From date — use YYYY-MM-DD');
    if (!isValidDate(form.toDate)) return setError('Invalid To date — use YYYY-MM-DD');

    setSaving(true);
    setError('');
    try {
      if (ev?._id) {
        await admin.updateEvent(ev._id, form, imageFile);
      } else {
        await admin.createEvent(form, imageFile);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const previewUri = imageFile?.uri || existingImage;

  return (
    <Modal animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalCloseBtn}>
            <Feather name="x" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.modalTitle}>{ev ? 'Edit Event' : 'New Event'}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Pressable onPress={pickImage} style={styles.imagePicker}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.imagePreview} contentFit="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="image" size={36} color={colors.brand300} />
                <Text style={styles.imagePlaceholderText}>Tap to pick a banner image</Text>
              </View>
            )}
            <View style={styles.imagePickerOverlay}>
              <Feather name="camera" size={14} color="#fff" />
              <Text style={styles.imagePickerOverlayText}>{previewUri ? 'Change' : 'Choose image'}</Text>
            </View>
          </Pressable>

          <Input
            label="Title *"
            placeholder="Public meeting at Anna Salai"
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="From date *"
                placeholder="YYYY-MM-DD"
                value={form.fromDate}
                onChangeText={(v) => setForm({ ...form, fromDate: v })}
                hint="Format: 2026-05-20"
              />
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Input
                label="To date *"
                placeholder="YYYY-MM-DD"
                value={form.toDate}
                onChangeText={(v) => setForm({ ...form, toDate: v })}
              />
            </View>
          </View>

          <Input
            label="Location"
            placeholder="Chennai"
            value={form.location}
            onChangeText={(v) => setForm({ ...form, location: v })}
          />

          <Input
            label="Description"
            placeholder="What is the event about?"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={4}
            inputStyle={{ minHeight: 90, textAlignVertical: 'top' }}
          />

          <Pressable onPress={() => setForm({ ...form, active: !form.active })} style={styles.checkboxRow}>
            <View style={[styles.checkbox, form.active && styles.checkboxOn]}>
              {form.active && <Feather name="check" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Active (visible to citizens on WhatsApp + app)</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={ev ? 'Save changes' : 'Create event'}
            icon={<Feather name={ev ? 'save' : 'plus'} size={16} color={colors.brand700} />}
            onPress={submit}
            loading={saving}
            disabled={saving}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ──────────────── helpers ──────────────── */

function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtRange(from, to) {
  if (!from) return '';
  const a = new Date(from);
  const b = to ? new Date(to) : null;
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  if (!b || a.toDateString() === b.toDateString()) return a.toLocaleDateString('en-IN', opts);
  return `${a.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${b.toLocaleDateString('en-IN', opts)}`;
}

const styles = StyleSheet.create({
  fab: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brand700,
    alignItems: 'center', justifyContent: 'center',
  },
  cover: { width: '100%', height: 160, backgroundColor: colors.brand50 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: 4, flexWrap: 'wrap' },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  dates: { ...typography.caption, color: colors.brand700, fontWeight: '700', marginTop: 2 },
  metaText: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  desc: { ...typography.caption, color: colors.text, marginTop: spacing.sm, lineHeight: 18 },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },

  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 50, paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  modalCloseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { ...typography.h2, color: colors.text },
  modalBody: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  imagePicker: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.brand50, height: 180, position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  imagePlaceholderText: { ...typography.caption, color: colors.textMuted },
  imagePickerOverlay: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  imagePickerOverlayText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  row: { flexDirection: 'row' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.brand700, borderColor: colors.brand700 },
  checkboxLabel: { ...typography.body, color: colors.text, flex: 1 },

  error: { ...typography.caption, color: colors.red, marginTop: spacing.sm },
});
