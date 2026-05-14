import { Image } from 'expo-image';
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, spacing, radius, typography } from '../../theme';
import * as portal from '../../api/portal';
import { thumb } from '../../utils/cloudinary';

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
  // Holds the freshly created ticket so we can show a dedicated success
  // screen instead of a native Alert. Reset (along with service/option) on
  // blur so the next time the user enters the tab they start at step 1.
  const [submitted, setSubmitted] = useState(null); // { ticketId, optionTitle, serviceTitle }

  useEffect(() => {
    portal.getServices()
      .then((d) => setServices(d?.services || []))
      .catch((e) => Alert.alert('Could not load services', e.message))
      .finally(() => setLoading(false));
  }, []);

  // Reset the wizard whenever the tab loses focus so the user never returns
  // to a half-filled form or a stale success screen — they always land on
  // the fresh category grid.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setService(null);
        setOption(null);
        setSubmitted(null);
      };
    }, [])
  );

  // Hide the native stack header once the user drills into a category or
  // lands on the success screen — the in-screen header (or success layout)
  // already handles navigation.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: !service && !submitted });
  }, [navigation, service, submitted]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.brand600} /></View>;
  }

  // Step 4: success screen (after a ticket is created)
  if (submitted) {
    return (
      <SuccessScreen
        ticket={submitted}
        onRaiseAnother={() => {
          setSubmitted(null);
          setService(null);
          setOption(null);
        }}
        onViewRequests={() => {
          setSubmitted(null);
          setService(null);
          setOption(null);
          navigation.getParent()?.navigate('RequestsTab', { screen: 'MyGrievances' });
        }}
      />
    );
  }

  // Step 3: form
  if (service && option) {
    return (
      <GrievanceForm
        service={service}
        option={option}
        onBack={() => setOption(null)}
        onDone={(ticketId) => {
          setSubmitted({
            ticketId,
            serviceTitle: service.title,
            optionTitle: option.title,
          });
        }}
      />
    );
  }

  // Step 2: option list
  if (service) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => setService(null)} hitSlop={10} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.brand700} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{service.title}</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {service.options.map((o) => (
            <Card key={o.id} onPress={() => setOption(o)} style={styles.optionRow}>
              {o.iconUrl ? (
                <Image source={{ uri: thumb(o.iconUrl, 120) }} style={styles.optionIcon} contentFit="cover" />
              ) : (
                <View style={styles.optionIconFallback}><Feather name="file-text" size={20} color={colors.brand700} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{o.title}</Text>
                {o.description ? <Text style={styles.optionDesc} numberOfLines={2}>{o.description}</Text> : null}
              </View>
              <Feather name="chevron-right" size={22} color={colors.textFaint} />
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
        {services.map((s) => (
          <Card key={s.id} onPress={() => setService(s)} style={styles.serviceRow}>
            {s.iconUrl ? (
              <Image source={{ uri: thumb(s.iconUrl, 160) }} style={styles.serviceIcon} contentFit="cover" />
            ) : (
              <View style={styles.serviceIconFallback}><Feather name="folder" size={22} color={colors.brand700} /></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>{s.title}</Text>
              {s.description ? <Text style={styles.serviceDesc} numberOfLines={2}>{s.description}</Text> : null}
            </View>
            <Feather name="chevron-right" size={22} color={colors.textFaint} />
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
    const externalUrl = kind === 'pdf' ? option.action?.pdfUrl : option.action?.url;
    const ctaIcon = kind === 'pdf' ? 'file-text' : 'external-link';
    const ctaDefault = kind === 'pdf' ? 'Open Document' : 'Open Link';
    const openExternal = async () => {
      if (!externalUrl) return;
      try {
        const ok = await Linking.canOpenURL(externalUrl);
        if (!ok) throw new Error('Cannot open this URL on this device');
        await Linking.openURL(externalUrl);
      } catch (e) {
        Alert.alert('Could not open', e.message || externalUrl);
      }
    };
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.headerBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.brand700} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{option.title}</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <FormHeroBanner option={option} service={service} />
          <Card style={{ marginTop: spacing.md }}>
            {option.description ? <Text style={styles.optionDesc}>{option.description}</Text> : null}
            <Text style={[styles.optionDesc, { marginTop: spacing.sm }]}>
              {kind === 'pdf'
                ? 'Tap below to view or download the official document.'
                : 'Tap below to continue on the official Government portal.'}
            </Text>
            {externalUrl ? (
              <Button
                label={option.action.ctaLabel || ctaDefault}
                icon={<Feather name={ctaIcon} size={18} color={colors.brand700} />}
                onPress={openExternal}
                style={{ marginTop: spacing.md }}
              />
            ) : (
              <Text style={[styles.error, { marginTop: spacing.md }]}>
                This resource isn't configured yet. Please check back soon.
              </Text>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.brand700} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{option.title}</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormHeroBanner option={option} service={service} />

        {needsDescription && (
          <View style={{ marginTop: spacing.lg }}>
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
          <View style={{ marginTop: spacing.lg }}>
            <Input
              label={needsLocation ? 'Location (required)' : 'Landmark / address (optional)'}
              placeholder="Enter street or landmark"
              value={locationText}
              onChangeText={setLocationText}
            />
            <Button
              label={coords ? `Location captured · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Use my current location'}
              icon={<Feather name={coords ? 'check-circle' : 'map-pin'} size={16} color={coords ? colors.statusCompleted : colors.brand700} />}
              variant="secondary"
              size="sm"
              onPress={captureLocation}
              loading={locating}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}

        {(needsPhoto || needsDescription) && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.fieldLabel}>{needsPhoto ? 'Photo (required)' : 'Photo (optional)'}</Text>
            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                <Pressable onPress={() => setPhoto(null)} style={styles.photoRemove}>
                  <Feather name="x" size={14} color="#fff" />
                  <Text style={styles.photoRemoveText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <Button
                  label="Camera"
                  icon={<Feather name="camera" size={16} color={colors.text} />}
                  variant="secondary"
                  size="sm"
                  onPress={() => pickPhoto('camera')}
                  style={{ flex: 1 }}
                />
                <View style={{ width: spacing.sm }} />
                <Button
                  label="Gallery"
                  icon={<Feather name="image" size={16} color={colors.text} />}
                  variant="secondary"
                  size="sm"
                  onPress={() => pickPhoto('library')}
                  style={{ flex: 1 }}
                />
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

function SuccessScreen({ ticket, onRaiseAnother, onViewRequests }) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.successBody}>
        <View style={styles.successIconWrap}>
          <Feather name="check" size={56} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Grievance Submitted</Text>
        <Text style={styles.successSubtitle}>
          Your request has been recorded and forwarded to the concerned team.
        </Text>

        <View style={styles.ticketPill}>
          <Text style={styles.ticketLabel}>Ticket ID</Text>
          <Text style={styles.ticketId}>{ticket.ticketId}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Feather name="folder" size={16} color={colors.brand700} />
            <Text style={styles.summaryText}>{ticket.serviceTitle}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Feather name="alert-circle" size={16} color={colors.brand700} />
            <Text style={styles.summaryText}>{ticket.optionTitle}</Text>
          </View>
        </View>

        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What happens next</Text>
          <NextStep icon="bell" text="You'll receive WhatsApp updates as your request progresses" />
          <NextStep icon="users" text="The party team will review and assign it within 24 hours" />
          <NextStep icon="check-circle" text="Track resolution status anytime from My Requests" />
        </View>

        <Button
          label="Track this request"
          icon={<Feather name="inbox" size={16} color={colors.brand700} />}
          onPress={onViewRequests}
          style={{ marginTop: spacing.xl }}
        />
        <Button
          label="Raise another grievance"
          variant="secondary"
          icon={<Feather name="plus" size={16} color={colors.text} />}
          onPress={onRaiseAnother}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function NextStep({ icon, text }) {
  return (
    <View style={styles.nextStepRow}>
      <View style={styles.nextStepIcon}>
        <Feather name={icon} size={14} color={colors.brand700} />
      </View>
      <Text style={styles.nextStepText}>{text}</Text>
    </View>
  );
}

/**
 * Wide hero banner shown at the top of the grievance form. Uses the action's
 * uploaded headerUrl if present, else falls back to the option's icon, then
 * the service's icon. Resolved through `thumb()` for fast delivery.
 */
function FormHeroBanner({ option, service }) {
  const heroUrl = option.action?.headerUrl || option.iconUrl || service.iconUrl || '';
  if (!heroUrl) {
    return (
      <View style={[styles.heroBanner, styles.heroBannerFallback]}>
        <Feather name="file-text" size={40} color={colors.brand700} />
      </View>
    );
  }
  return (
    <View style={styles.heroBanner}>
      <Image source={{ uri: thumb(heroUrl, 600) }} style={styles.heroBannerImg} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: '#fff' },
  back: { color: colors.brand700, fontWeight: '700', width: 50 },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...typography.h3, flex: 1, textAlign: 'center', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  serviceIcon: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.brand50 },
  serviceIconFallback: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { ...typography.bodyBold, color: colors.text },
  serviceDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  optionIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.brand50 },
  optionIconFallback: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { ...typography.bodyBold, color: colors.text },
  optionDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xs },
  chev: { fontSize: 24, color: colors.textFaint },

  // Hero banner shown at the top of the grievance form. contentFit=contain on
  // the inner Image keeps the full icon visible (no cropping), while the tile
  // itself has a soft brand tint so transparent PNGs read well.
  heroBanner: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center', height: 200 },
  heroBannerImg: { width: '100%', height: '100%' },
  heroBannerFallback: { height: 200, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  photoRow: { flexDirection: 'row' },
  photoPreview: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  photoImg: { width: '100%', height: 200 },
  photoRemove: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  photoRemoveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  error: { ...typography.caption, color: colors.red, marginTop: spacing.md },

  // Success screen
  successBody: { padding: spacing.lg, paddingBottom: spacing.xxl, alignItems: 'center' },
  successIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.statusCompleted || '#16a34a',
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
    shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  successTitle: { ...typography.h1, color: colors.text, textAlign: 'center' },
  successSubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md },
  ticketPill: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand50,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  ticketLabel: { ...typography.captionBold, color: colors.brand700, textTransform: 'uppercase', letterSpacing: 0.6 },
  ticketId: { ...typography.bodyBold, color: colors.brand700, ...typography.tabular },

  summaryCard: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  summaryText: { ...typography.body, color: colors.text, flex: 1 },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 },

  nextStepsCard: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.brand50,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  nextStepsTitle: { ...typography.captionBold, color: colors.brand700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 6 },
  nextStepIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  nextStepText: { ...typography.body, color: colors.text, flex: 1, lineHeight: 20 },
});
