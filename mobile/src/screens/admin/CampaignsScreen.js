import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';;
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Card, Badge } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, spacing, typography, radius } from '../../theme';
import * as admin from '../../api/admin';

/**
 * Admin Campaigns screen — mirrors the web frontend's Campaigns page
 * (frontend/src/pages/Campaigns.jsx). Lets admins:
 *   1. Build a WhatsApp template (name, language, category, header, body,
 *      footer, buttons) and submit it directly to Meta via POST /campaigns.
 *   2. Watch the template status (PENDING → APPROVED / REJECTED) without
 *      pressing refresh — every 20s the list reloads, every 60s the backend
 *      reconciles statuses with Meta (POST /campaigns/sync).
 *   3. Send the approved template to all members in one tap.
 *   4. Delete the template (also removed from Meta).
 */

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  DRAFT: '#6b7280',
  PAUSED: '#6b7280',
  DISABLED: '#6b7280',
  IN_APPEAL: '#3b82f6',
};

export default function CampaignsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = await admin.getCampaigns();
      setItems(d?.campaigns || []);
    } catch {} finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Two-tier live loop matching the web:
    //   - every 20s pull the list
    //   - every 3rd tick (≈60s) silently ask the backend to reconcile
    //     template statuses with Meta
    let syncTick = 0;
    const t = setInterval(async () => {
      syncTick += 1;
      if (syncTick >= 3) {
        syncTick = 0;
        try { await admin.syncCampaigns(); } catch {}
      }
      await load({ silent: true });
    }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const send = (c) => {
    Alert.alert(
      'Broadcast template',
      `Send "${c.name}" to all members?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(c._id);
            try {
              const r = await admin.sendCampaign(c._id);
              Alert.alert('Broadcast complete', `Sent: ${r.success ?? 0} • Failed: ${r.failed ?? 0} • Total: ${r.total ?? 0}`);
              load();
            } catch (e) {
              Alert.alert('Send failed', e.message);
            } finally {
              setSending(null);
            }
          },
        },
      ]
    );
  };

  const remove = (c) => {
    Alert.alert(
      'Delete template',
      `Delete "${c.name}"? It will also be removed from Meta.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await admin.deleteCampaign(c._id); load(); }
            catch (e) { Alert.alert('Delete failed', e.message); }
          },
        },
      ]
    );
  };

  return (
    <Screen
      showBack
      title="Campaigns"
      subtitle={
        <View style={styles.subtitleRow}>
          <View style={styles.liveDot}><View style={styles.liveDotInner} /></View>
          <Text style={styles.subtitleText}>{items.length} template{items.length === 1 ? '' : 's'} · live</Text>
        </View>
      }
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      rightAction={
        <Pressable onPress={() => setShowForm(true)} style={styles.fab} hitSlop={10}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      }
    >
      {items.length === 0 ? (
        <Card><Text style={styles.empty}>No templates yet. Tap + to build one.</Text></Card>
      ) : (
        items.map((c) => (
          <Card key={c._id} style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
            {c.headerType === 'IMAGE' && c.headerMediaUrl ? (
              <Image source={{ uri: c.headerMediaUrl }} style={styles.cover} contentFit="cover" />
            ) : c.headerType === 'TEXT' ? (
              <View style={styles.textHeader}>
                <Text style={styles.textHeaderText} numberOfLines={2}>{c.headerText}</Text>
              </View>
            ) : null}
            <View style={{ padding: spacing.lg }}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>{c.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: (STATUS_COLORS[c.status] || '#6b7280') + '20', borderColor: STATUS_COLORS[c.status] || '#6b7280' }]}>
                  <Text style={[styles.statusPillText, { color: STATUS_COLORS[c.status] || '#6b7280' }]}>{c.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{c.category} · {c.language}</Text>
              <Text style={styles.body} numberOfLines={4}>{c.bodyText}</Text>
              {c.footerText ? <Text style={styles.footer}>{c.footerText}</Text> : null}
              {c.buttons?.length > 0 && (
                <View style={styles.btnsRow}>
                  {c.buttons.map((b, i) => (
                    <View key={i} style={styles.btnPill}>
                      {b.type === 'URL' && <Feather name="external-link" size={11} color={colors.brand700} />}
                      {b.type === 'PHONE_NUMBER' && <Feather name="phone" size={11} color={colors.brand700} />}
                      {b.type === 'QUICK_REPLY' && <Feather name="message-circle" size={11} color={colors.brand700} />}
                      <Text style={styles.btnPillText} numberOfLines={1}>{b.text}</Text>
                    </View>
                  ))}
                </View>
              )}
              {c.rejectionReason ? (
                <View style={styles.rejection}>
                  <Feather name="alert-octagon" size={12} color={colors.red} />
                  <Text style={styles.rejectionText}>{c.rejectionReason}</Text>
                </View>
              ) : null}
              {c.sends?.length > 0 ? (
                <Text style={styles.lastSent}>
                  Last sent: {new Date(c.sends.at(-1).sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {c.sends.at(-1).success}/{c.sends.at(-1).total} ok
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  label={sending === c._id ? 'Sending…' : 'Send'}
                  icon={!sending || sending !== c._id ? <Feather name="send" size={14} color={colors.brand700} /> : null}
                  size="sm"
                  onPress={() => send(c)}
                  loading={sending === c._id}
                  disabled={c.status !== 'APPROVED' || sending === c._id}
                  style={{ flex: 1 }}
                />
                <View style={{ width: spacing.sm }} />
                <Button
                  label=""
                  icon={<Feather name="trash-2" size={14} color="#fff" />}
                  variant="danger"
                  size="sm"
                  onPress={() => remove(c)}
                  fullWidth={false}
                  style={{ paddingHorizontal: spacing.md }}
                />
              </View>
            </View>
          </Card>
        ))
      )}

      {showForm && (
        <CampaignFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </Screen>
  );
}

/* ──────────────── Modal: template builder ──────────────── */

const blank = {
  name: '',
  language: 'en_US',
  category: 'MARKETING',
  headerType: 'NONE',
  headerText: '',
  bodyText: '',
  footerText: '',
  buttons: [],
};

function CampaignFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(blank);
  const [mediaFile, setMediaFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickMedia = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: form.headerType === 'VIDEO'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (result.canceled) return;
      const a = result.assets[0];
      setMediaFile({
        uri: a.uri,
        name: a.fileName || `media_${Date.now()}`,
        type: a.mimeType || (form.headerType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
      });
    } catch (e) {
      Alert.alert('Could not pick media', e.message);
    }
  };

  const submit = async () => {
    if (!form.name.trim() || !/^[a-z0-9_]+$/.test(form.name)) {
      return setError('Name must be lower_snake_case (a-z, 0-9, _)');
    }
    if (!form.bodyText.trim()) return setError('Body text is required');

    setSaving(true);
    setError('');
    try {
      const r = await admin.createCampaign(form, mediaFile);
      const c = r.campaign;
      if (c?.status === 'REJECTED') {
        Alert.alert('Rejected by Meta', c.rejectionReason || 'Unknown reason');
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  const addButton = (type) => {
    if (form.buttons.length >= 10) return;
    setForm({ ...form, buttons: [...form.buttons, { type, text: '', url: '', phone_number: '' }] });
  };
  const updateButton = (idx, patch) => {
    const next = [...form.buttons];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, buttons: next });
  };
  const removeButton = (idx) => {
    setForm({ ...form, buttons: form.buttons.filter((_, i) => i !== idx) });
  };

  const HEADER_TYPES = [
    { v: 'NONE', label: '—', icon: null },
    { v: 'TEXT', label: 'Text', icon: 'type' },
    { v: 'IMAGE', label: 'Image', icon: 'image' },
    { v: 'VIDEO', label: 'Video', icon: 'video' },
    { v: 'DOCUMENT', label: 'Doc', icon: 'file-text' },
  ];

  return (
    <Modal animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalCloseBtn}>
            <Feather name="x" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.modalTitle}>New Template</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Template name *"
                placeholder="welcome_message"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                hint="lower_snake_case only"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Language</Text>
              <View style={styles.segmentRow}>
                {['en_US', 'en', 'ta', 'hi'].map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => setForm({ ...form, language: l })}
                    style={[styles.segment, form.language === l && styles.segmentOn]}
                  >
                    <Text style={[styles.segmentText, form.language === l && styles.segmentTextOn]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.segmentRow}>
              {['MARKETING', 'UTILITY', 'AUTHENTICATION'].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setForm({ ...form, category: c })}
                  style={[styles.segment, form.category === c && styles.segmentOn]}
                >
                  <Text style={[styles.segmentText, form.category === c && styles.segmentTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Header</Text>
            <View style={styles.segmentRow}>
              {HEADER_TYPES.map((h) => (
                <Pressable
                  key={h.v}
                  onPress={() => { setForm({ ...form, headerType: h.v, headerText: '' }); setMediaFile(null); }}
                  style={[styles.segment, form.headerType === h.v && styles.segmentOn]}
                >
                  {h.icon && <Feather name={h.icon} size={12} color={form.headerType === h.v ? '#fff' : colors.brand700} />}
                  <Text style={[styles.segmentText, form.headerType === h.v && styles.segmentTextOn, h.icon && { marginLeft: 4 }]}>{h.label}</Text>
                </Pressable>
              ))}
            </View>
            {form.headerType === 'TEXT' && (
              <View style={{ marginTop: spacing.sm }}>
                <Input
                  placeholder="Header text (max 60 chars)"
                  maxLength={60}
                  value={form.headerText}
                  onChangeText={(v) => setForm({ ...form, headerText: v })}
                />
              </View>
            )}
            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.headerType) && (
              <Pressable onPress={pickMedia} style={styles.mediaPicker}>
                {mediaFile ? (
                  form.headerType === 'IMAGE' ? (
                    <Image source={{ uri: mediaFile.uri }} style={styles.mediaPreview} contentFit="cover" />
                  ) : (
                    <View style={styles.mediaInfoRow}>
                      <Feather name={form.headerType === 'VIDEO' ? 'video' : 'file-text'} size={20} color={colors.brand700} />
                      <Text style={styles.mediaInfoText} numberOfLines={1}>{mediaFile.name}</Text>
                    </View>
                  )
                ) : (
                  <View style={styles.mediaPlaceholder}>
                    <Feather name="upload" size={20} color={colors.brand700} />
                    <Text style={styles.mediaPlaceholderText}>Tap to choose {form.headerType.toLowerCase()}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          <Input
            label="Body * (1024 chars max)"
            placeholder="The message your members will see…"
            value={form.bodyText}
            onChangeText={(v) => setForm({ ...form, bodyText: v })}
            multiline
            numberOfLines={6}
            maxLength={1024}
            inputStyle={{ minHeight: 120, textAlignVertical: 'top' }}
            hint={`${form.bodyText.length}/1024`}
          />

          <Input
            label="Footer (optional)"
            placeholder="Small print, max 60 chars"
            maxLength={60}
            value={form.footerText}
            onChangeText={(v) => setForm({ ...form, footerText: v })}
          />

          <View>
            <View style={styles.btnHeader}>
              <Text style={styles.fieldLabel}>Buttons (max 10)</Text>
              <View style={styles.btnAddRow}>
                <Pressable onPress={() => addButton('QUICK_REPLY')} style={styles.btnAdd}>
                  <Feather name="message-circle" size={11} color={colors.brand700} />
                  <Text style={styles.btnAddText}>Reply</Text>
                </Pressable>
                <Pressable onPress={() => addButton('URL')} style={styles.btnAdd}>
                  <Feather name="external-link" size={11} color={colors.brand700} />
                  <Text style={styles.btnAddText}>URL</Text>
                </Pressable>
                <Pressable onPress={() => addButton('PHONE_NUMBER')} style={styles.btnAdd}>
                  <Feather name="phone" size={11} color={colors.brand700} />
                  <Text style={styles.btnAddText}>Call</Text>
                </Pressable>
              </View>
            </View>

            {form.buttons.length === 0 ? (
              <Text style={styles.btnEmpty}>No buttons yet. Tap Reply / URL / Call to add up to 10.</Text>
            ) : (
              form.buttons.map((b, i) => (
                <View key={i} style={styles.btnEditor}>
                  <View style={styles.btnEditorHeader}>
                    <Text style={styles.btnTypeLabel}>
                      {b.type === 'PHONE_NUMBER' ? 'CALL' : b.type === 'URL' ? 'URL' : 'REPLY'}
                    </Text>
                    <Pressable onPress={() => removeButton(i)} hitSlop={10}>
                      <Feather name="x" size={16} color={colors.red} />
                    </Pressable>
                  </View>
                  <Input
                    placeholder="Button text (max 25)"
                    maxLength={25}
                    value={b.text}
                    onChangeText={(v) => updateButton(i, { text: v })}
                  />
                  {b.type === 'URL' && (
                    <View style={{ marginTop: spacing.sm }}>
                      <Input
                        placeholder="https://…"
                        value={b.url}
                        onChangeText={(v) => updateButton(i, { url: v })}
                      />
                    </View>
                  )}
                  {b.type === 'PHONE_NUMBER' && (
                    <View style={{ marginTop: spacing.sm }}>
                      <Input
                        placeholder="+91 9999999999"
                        value={b.phone_number}
                        onChangeText={(v) => updateButton(i, { phone_number: v })}
                        keyboardType="phone-pad"
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={styles.metaNotice}>
            <Feather name="info" size={14} color={colors.brand700} />
            <Text style={styles.metaNoticeText}>
              After creation the template is submitted to Meta and shows as <Text style={{ fontWeight: '700' }}>PENDING</Text>. Approval typically takes a few minutes — once <Text style={{ fontWeight: '700' }}>APPROVED</Text>, tap Send to broadcast to all members.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={saving ? 'Submitting to Meta…' : 'Submit to Meta'}
            icon={!saving ? <Feather name="send" size={16} color={colors.brand700} /> : null}
            onPress={submit}
            loading={saving}
            disabled={saving}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brand700,
    alignItems: 'center', justifyContent: 'center',
  },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b98140', alignItems: 'center', justifyContent: 'center' },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  subtitleText: { ...typography.caption, color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },

  cover: { width: '100%', height: 120, backgroundColor: colors.brand50 },
  textHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  textHeaderText: { ...typography.bodyBold, color: colors.brand900 || colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1, fontSize: 16 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  body: { ...typography.body, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  footer: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm },
  btnsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  btnPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.brand50, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.brand100 || colors.border,
  },
  btnPillText: { ...typography.caption, color: colors.brand700, fontWeight: '700', fontSize: 11 },
  rejection: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.redSoft || '#fee2e2', padding: 8, borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  rejectionText: { ...typography.caption, color: colors.red, flex: 1 },
  lastSent: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  actions: { flexDirection: 'row', marginTop: spacing.md },

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
  row: { flexDirection: 'row' },

  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },

  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: '#fff',
  },
  segmentOn: { backgroundColor: colors.brand700, borderColor: colors.brand700 },
  segmentText: { ...typography.captionBold, color: colors.text, fontSize: 12 },
  segmentTextOn: { color: '#fff' },

  mediaPicker: { marginTop: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed', backgroundColor: '#fff', overflow: 'hidden' },
  mediaPlaceholder: { padding: spacing.lg, alignItems: 'center', gap: 6 },
  mediaPlaceholderText: { ...typography.caption, color: colors.textMuted },
  mediaPreview: { width: '100%', height: 140 },
  mediaInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  mediaInfoText: { ...typography.body, color: colors.text, flex: 1 },

  btnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  btnAddRow: { flexDirection: 'row', gap: 6 },
  btnAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    backgroundColor: colors.brand50, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.brand100 || colors.border,
  },
  btnAddText: { ...typography.captionBold, color: colors.brand700, fontSize: 11 },
  btnEmpty: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  btnEditor: {
    backgroundColor: colors.brand50, borderRadius: radius.md, padding: spacing.md,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.brand100 || colors.border,
  },
  btnEditorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  btnTypeLabel: { ...typography.captionBold, color: colors.brand700, letterSpacing: 0.6 },

  metaNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md,
  },
  metaNoticeText: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 18 },

  error: { ...typography.caption, color: colors.red, marginTop: spacing.sm },
});
