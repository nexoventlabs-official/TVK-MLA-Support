import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { Card, Badge } from '../../components/Card';
import { colors, spacing, radius, typography } from '../../theme';
import * as portal from '../../api/portal';

/**
 * Three-step flow:
 *   1. Pick a service (top-level category)
 *   2. Pick an option within the service
 *   3. Fill out the form (description, location, photo) → submit
 *
 * Required fields depend on the option's `action.kind`:
 *   - ticket / details_then_url     → description required
 *   - location_only_ticket          → location captured (description auto-generated)
 *   - location_photos_ticket        → location + at least 1 photo required
 *   - url / pdf                     → no ticket; redirect/external (we just show a link)
 */
export default function NewGrievanceScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);
  const [option, setOption] = useState(null);

  useEffect(() => {
    portal.getServices()
      .then((d) => setServices(d?.services || []))
      .catch((e) => Alert.alert('Could not load services', e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.brand600} /></View>;
  }

  // Step 3: form
  if (service && option) {
    return (
      <GrievanceForm
        service={service}
        option={option}
        onBack={() => setOption(null)}
        onDone={(ticketId) => {
          Alert.alert('Submitted!', `Your ticket ${ticketId} has been recorded. We'll keep you posted on WhatsApp.`,
            [{ text: 'View my grievances', onPress: () => navigation.replace('GrievancesTab', { screen: 'MyGrievances' }) }]);
        }}
      />
    );
  }

  // Step 2: option list
  if (service) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => setService(null)}><Text style={styles.back}>← Back</Text></Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{service.title}</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>Pick the issue type</Text>
          {service.options.map((o) => (
            <Card key={o.id} onPress={() => setOption(o)} style={styles.optionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{o.title}</Text>
                {o.description ? <Text style={styles.optionDesc} numberOfLines={2}>{o.description}</Text> : null}
                {o.action?.kind && <Badge label={kindLabel(o.action.kind)} color={colors.brand600} soft />}
              </View>
              <Text style={styles.chev}>›</Text>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 1: service grid
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>What kind of issue?</Text>
        {services.map((s) => (
          <Card key={s.id} onPress={() => setService(s)} style={styles.serviceRow}>
            {s.iconUrl ? <Image source={{ uri: s.iconUrl }} style={styles.serviceIcon} /> : <View style={styles.serviceIconFallback}><Text>📋</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>{s.title}</Text>
              {s.description ? <Text style={styles.serviceDesc} numberOfLines={2}>{s.description}</Text> : null}
            </View>
            <Text style={styles.chev}>›</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GrievanceForm({ service, option, onBack, onDone }) {
  const kind = option.action?.kind || 'ticket';
  const needsDescription = ['ticket', 'details_then_url'].includes(kind);
  const needsLocation = ['location_only_ticket', 'location_photos_ticket'].includes(kind);
  const needsPhoto = kind === 'location_photos_ticket';
  const isExternal = ['url', 'pdf'].includes(kind);

  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [photo, setPhoto] = useState(null);   // ImagePicker asset
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const captureLocation = async () => {
    setError(''); setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission denied. Please enable it in Settings to attach the spot.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(c);
      // Reverse geocode (best-effort) for a human label
      try {
        const places = await Location.reverseGeocodeAsync(loc.coords);
        if (places?.[0]) {
          const p = places[0];
          const label = [p.name, p.street, p.district, p.city].filter(Boolean).join(', ');
          if (label && !locationText) setLocationText(label);
        }
      } catch {}
    } catch (err) {
      setError(err.message || 'Could not fetch location');
    } finally { setLocating(false); }
  };

  const pickPhoto = async (source = 'library') => {
    setError('');
    const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: false };
    let res;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') { setError('Camera permission denied'); return; }
      res = await ImagePicker.launchCameraAsync(opts);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { setError('Photo library permission denied'); return; }
      res = await ImagePicker.launchImageLibraryAsync(opts);
    }
    if (res.canceled) return;
    const a = res.assets[0];
    setPhoto({
      uri: a.uri,
      name: a.fileName || `photo-${Date.now()}.jpg`,
      type: a.mimeType || 'image/jpeg',
    });
  };

  const submit = async () => {
    setError('');
    if (needsDescription && description.trim().length < 5) { setError('Please describe the issue (5+ chars)'); return; }
    if (needsLocation && !coords) { setError('Please capture the location'); return; }
    if (needsPhoto && !photo) { setError('Please attach a photo'); return; }
    setBusy(true);
    try {
      const payload = {
        serviceId: service.id, serviceTitle: service.title,
        optionId: option.id, optionTitle: option.title,
        description: description.trim(),
        location: locationText.trim(),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      };
      const res = await portal.createGrievance(payload, photo);
      onDone(res.grievanceId || res.request?.ticketId);
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally { setBusy(false); }
  };

  if (isExternal) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.headerBar}>
          <Pressable onPress={onBack}><Text style={styles.back}>← Back</Text></Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{option.title}</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Card>
            <Text style={styles.serviceTitle}>{option.title}</Text>
            {option.description && <Text style={styles.optionDesc}>{option.description}</Text>}
            <Text style={[styles.optionDesc, { marginTop: spacing.md }]}>
              This issue type opens an external resource. Please use the link below.
            </Text>
            {option.action?.url ? (
              <Button label={option.action.ctaLabel || 'Open link'}
                onPress={() => Alert.alert('Open link', option.action.url)}
                style={{ marginTop: spacing.md }} />
            ) : null}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={onBack}><Text style={styles.back}>← Back</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{option.title}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.formTitle}>{service.title}</Text>
          <Text style={styles.optionDesc}>{option.title}</Text>
        </Card>

        {needsDescription && (
          <View style={{ marginTop: spacing.md }}>
            <Input
              label="Describe the issue"
              placeholder="What's wrong, where, when…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              maxLength={2000}
              inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
              hint={`${description.length}/2000`}
            />
          </View>
        )}

        {(needsLocation || needsDescription) && (
          <View style={{ marginTop: spacing.md }}>
            <Input
              label={needsLocation ? 'Location (required)' : 'Landmark / address (optional)'}
              placeholder="Street, landmark, area"
              value={locationText}
              onChangeText={setLocationText}
            />
            <Button
              label={coords ? `📍 Captured (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) — refresh` : '📍 Use my current location'}
              variant="secondary"
              size="sm"
              onPress={captureLocation}
              loading={locating}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}

        {(needsPhoto || needsDescription) && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.fieldLabel}>{needsPhoto ? 'Photo (required)' : 'Photo (optional)'}</Text>
            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                <Pressable onPress={() => setPhoto(null)} style={styles.photoRemove}>
                  <Text style={styles.photoRemoveText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <Button label="📷 Camera" variant="secondary" size="sm" onPress={() => pickPhoto('camera')} />
                <View style={{ width: spacing.sm }} />
                <Button label="🖼️ Gallery" variant="secondary" size="sm" onPress={() => pickPhoto('library')} />
              </View>
            )}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Submit Grievance"
          onPress={submit}
          loading={busy}
          disabled={busy}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function kindLabel(k) {
  return {
    ticket: 'Description',
    location_only_ticket: 'Location',
    location_photos_ticket: 'Location + Photo',
    details_then_url: 'Description',
    url: 'External link',
    pdf: 'Document',
  }[k] || 'Form';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: '#fff' },
  back: { color: colors.brand700, fontWeight: '700', width: 50 },
  headerTitle: { ...typography.h3, flex: 1, textAlign: 'center', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  serviceIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brand50 },
  serviceIconFallback: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { ...typography.bodyBold, color: colors.text },
  serviceDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  optionTitle: { ...typography.bodyBold, color: colors.text },
  optionDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xs },
  chev: { fontSize: 24, color: colors.textFaint },
  formTitle: { ...typography.h2, color: colors.text },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  photoRow: { flexDirection: 'row' },
  photoPreview: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  photoImg: { width: '100%', height: 200 },
  photoRemove: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  photoRemoveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  error: { ...typography.caption, color: colors.red, marginTop: spacing.md },
});
