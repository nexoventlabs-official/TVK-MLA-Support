import { Image } from 'expo-image';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput,  } from 'react-native';;
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, radius, typography } from '../../theme';
import * as authApi from '../../api/auth';

const VIJAY_IMG = require('../../../assets/vijay.png');

/**
 * Mirrors the web grievance-portal RegisterPage state machine:
 *
 *   mode = 'epic'    → Step 1 form (EPIC + Mobile + DOB)
 *                   → Step 2 voter-details confirmation card
 *                   → Step 3 OTP entry
 *
 *   mode = 'manual'  → Step 1 form (Name + Mobile + Gender + DOB)
 *                   → Step 3 OTP entry  (step 2 skipped)
 *
 * Switching modes always resets every field so half-typed values from one
 * path never leak into the other.
 */
export default function RegisterScreen({ navigation }) {
  const { signInUser } = useAuth();

  const [mode, setMode] = useState('epic');     // 'epic' | 'manual'
  const [step, setStep] = useState(1);          // 1 | 2 | 3
  const [form, setForm] = useState({ name: '', phone: '', dob: '', gender: '', epic: '' });
  const [voter, setVoter] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const otpRef = useRef(null);

  const isValidEpic = form.epic.length === 10;
  const isValidPhone = form.phone.length === 10;
  const isValidDob = !!parseDob(form.dob);
  const isValidName = form.name.trim().length >= 2;
  const isValidGender = !!form.gender;

  const canContinueEpic = isValidEpic && isValidPhone && isValidDob && !busy;
  const canContinueManual = isValidName && isValidPhone && isValidGender && isValidDob && !busy;

  // Auto-focus OTP input + resend cooldown.
  useEffect(() => {
    if (step === 3) setTimeout(() => otpRef.current?.focus(), 100);
  }, [step]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const totalSteps = mode === 'epic' ? 3 : 2;
  const renderedStep = mode === 'epic' ? step : (step === 3 ? 2 : 1);

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setStep(1);
    setForm({ name: '', phone: '', dob: '', gender: '', epic: '' });
    setVoter(null);
    setOtp('');
    setError('');
    setInfo('');
    setSecondsLeft(0);
  }

  function validatePhoneDob() {
    if (form.phone.length !== 10) return 'Enter a 10-digit mobile number';
    if (!form.dob || !parseDob(form.dob)) return 'Enter date of birth as DD/MM/YYYY';
    const iso = parseDob(form.dob);
    if (new Date(iso) > new Date()) return 'Date of birth cannot be in the future';
    return '';
  }

  async function lookupEpic() {
    setError('');
    const epic = form.epic.trim().toUpperCase();
    if (!/^[A-Z]{2,3}[0-9]{6,7}$/.test(epic)) {
      return setError('EPIC format looks invalid (e.g. TNA1234567)');
    }
    const phoneErr = validatePhoneDob();
    if (phoneErr) return setError(phoneErr);
    setBusy(true);
    try {
      const data = await authApi.portalLookupEpic({ epic, phone: form.phone, dob: parseDob(form.dob) });
      setVoter(data.voter);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not look up EPIC. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitManual() {
    setError('');
    if (!form.name.trim() || form.name.trim().length < 2) return setError('Enter your full name');
    const phoneErr = validatePhoneDob();
    if (phoneErr) return setError(phoneErr);
    if (!form.gender) return setError('Please select a gender');
    await requestOtp();
  }

  async function requestOtp() {
    setBusy(true);
    setError('');
    try {
      await authApi.portalSendOtp(form.phone, 'register');
      setStep(3);
      setInfo(`We sent a 6-digit code to +91 ${form.phone}.`);
      setSecondsLeft(45);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not send OTP. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function completeRegister() {
    setError('');
    if (otp.length < 6) return setError('Enter the 6-digit code');
    setBusy(true);
    try {
      const payload = {
        phone: form.phone,
        otp,
        dob: parseDob(form.dob),
      };
      if (mode === 'epic') {
        payload.epic = form.epic.trim().toUpperCase();
      } else {
        payload.name = form.name.trim();
        payload.gender = form.gender;
      }
      const data = await authApi.portalRegister(payload);
      await signInUser(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          <View style={styles.imageContainer}>
            <Image source={VIJAY_IMG} style={styles.heroImage} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Mylapore Citizen Portal</Text>

          {/* Step progress dots */}
          <View style={styles.dots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < renderedStep ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}


          {/* STEP 1 — EPIC form */}
          {step === 1 && mode === 'epic' && (
            <View style={{ gap: spacing.md }}>
              <FieldEpic value={form.epic} onChange={(v) => setForm({ ...form, epic: v })} />
              <FieldPhone value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldDob value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />

              <Button label="Continue" onPress={lookupEpic} loading={busy} disabled={!canContinueEpic} style={[styles.primaryBtn, { marginTop: spacing.sm }]} textStyle={styles.primaryBtnText} />

              <Pressable onPress={() => switchMode('manual')} style={styles.linkRow}>
                <Text style={styles.linkMuted}>Don't have an EPIC card? </Text>
                <Text style={styles.linkBold}>Register Manually</Text>
              </Pressable>
            </View>
          )}

          {/* STEP 1 — Manual form */}
          {step === 1 && mode === 'manual' && (
            <View style={{ gap: spacing.md }}>
              <FieldName value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <FieldPhone value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldGender value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
              <FieldDob value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />

              <Button label="Continue" onPress={submitManual} loading={busy} disabled={!canContinueManual} style={[styles.primaryBtn, { marginTop: spacing.sm }]} textStyle={styles.primaryBtnText} />

              <Pressable onPress={() => switchMode('epic')} style={styles.linkRow}>
                <Text style={styles.linkMuted}>Have an EPIC card? </Text>
                <Text style={styles.linkBold}>Use EPIC instead</Text>
              </Pressable>
            </View>
          )}

          {/* STEP 2 — Voter confirmation card (EPIC only) */}
          {step === 2 && mode === 'epic' && voter && (
            <View style={{ gap: spacing.lg }}>
              <View style={styles.voterCard}>
                <Text style={styles.voterName}>{voter.name || '—'}</Text>
                <Text style={styles.voterEpic}>{voter.epicNo}</Text>

                <View style={styles.voterList}>
                  {voter.gender ? <DetailRow label="Gender" value={voter.gender} /> : null}
                  {(voter.relationType || voter.relationName) ? (
                    <DetailRow label={voter.relationType || 'Relation'} value={voter.relationName || '—'} />
                  ) : null}
                  {voter.houseNo ? <DetailRow label="House No" value={voter.houseNo} /> : null}
                  {voter.assemblyName ? (
                    <DetailRow
                      label="Constituency"
                      value={`${voter.assemblyName}${voter.assemblyNo ? ` (${voter.assemblyNo})` : ''}`}
                    />
                  ) : null}
                </View>
              </View>

              <View>
                <Button label="Confirm & Send OTP" onPress={requestOtp} loading={busy} disabled={busy} style={styles.primaryBtn} textStyle={styles.primaryBtnText} />
                <Text style={[styles.voterDisclaimer, { textAlign: 'center', marginTop: spacing.md }]}>
                  If this is not you,{' '}
                  <Text style={styles.linkBold} onPress={() => { setStep(1); setVoter(null); setError(''); }}>
                    edit your EPIC
                  </Text>
                </Text>
              </View>
            </View>
          )}

          {/* STEP 3 — OTP entry (both modes) */}
          {step === 3 && (
            <View style={{ gap: spacing.lg }}>
              {mode === 'epic' && voter ? (
                <View style={{ marginBottom: spacing.xs }}>
                  <Text style={styles.regAsLabel}>REGISTERING AS</Text>
                  <Text style={styles.voterName} numberOfLines={1}>{voter.name}</Text>
                </View>
              ) : null}

              <View>
                <Text style={styles.otpLabel}>6-DIGIT CODE</Text>
                <TextInput
                  ref={otpRef}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  placeholder="••••••"
                  placeholderTextColor={colors.textFaint}
                  style={styles.otpInput}
                />
                <View style={styles.otpFootRow}>
                  <Text style={styles.otpFootHint}>Code expires in 5 minutes</Text>
                  <Pressable onPress={requestOtp} disabled={secondsLeft > 0 || busy}>
                    <Text style={[styles.linkBold, (secondsLeft > 0 || busy) && styles.linkDisabled]}>
                      {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend OTP'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Button
                label="Verify & Create Account"
                onPress={completeRegister}
                loading={busy}
                disabled={busy || otp.length !== 6}
                style={styles.primaryBtn} textStyle={styles.primaryBtnText}
              />
            </View>
          )}

          <Pressable onPress={() => navigation.goBack()} style={styles.bottomLink}>
            <Text style={styles.linkMuted}>Already registered? </Text>
            <Text style={styles.linkBold}>Log In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ───────── Reusable fields ───────── */

function FieldEpic({ value, onChange }) {
  const inputRef = useRef(null);
  const [kbType, setKbType] = useState('default');

  const handleChange = (raw) => {
    let clean = raw.toUpperCase().replace(/\s/g, '');
    let alphaPart = clean.slice(0, 3).replace(/[^A-Z]/g, '');
    let numPart = clean.slice(3, 10).replace(/\D/g, '');
    const newVal = alphaPart + numPart;

    if (newVal.length >= 3 && kbType === 'default') {
      setKbType('number-pad');
      setTimeout(() => {
        inputRef.current?.blur();
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 10);
    } else if (newVal.length < 3 && kbType === 'number-pad') {
      setKbType('default');
      setTimeout(() => {
        inputRef.current?.blur();
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 10);
    }

    onChange(newVal);
  };
  return (
    <Input
      ref={inputRef}
      label="Voter ID (EPIC)"
      placeholder="TNA1234567"
      value={value}
      onChangeText={handleChange}
      autoCapitalize="characters"
      keyboardType={kbType}
      maxLength={10}
    />
  );
}

function FieldName({ value, onChange }) {
  return (
    <Input
      label="Full Name"
      placeholder="As on your government ID"
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^a-zA-Z\s]/g, ''))}
      autoCapitalize="words"
    />
  );
}

function FieldPhone({ value, onChange }) {
  return (
    <Input
      label="Mobile Number"
      placeholder="10-digit number"
      value={value}
      onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 10))}
      keyboardType="number-pad"
      maxLength={10}
      leftAdornment={<Text style={styles.phonePrefix}>+91</Text>}
    />
  );
}

function FieldDob({ value, onChange }) {
  // Auto-insert slashes as the user types: DDMMYYYY → DD/MM/YYYY.
  function onText(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length >= 5) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length >= 3) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChange(out);
  }
  return (
    <Input
      label="Date of Birth"
      placeholder="dd/mm/yyyy"
      value={value}
      onChangeText={onText}
      keyboardType="number-pad"
      maxLength={10}
    />
  );
}

function FieldGender({ value, onChange }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.genderRow}>
        {['Male', 'Female', 'Other'].map((g) => (
          <Pressable
            key={g}
            onPress={() => onChange(g)}
            style={[styles.genderChip, value === g && styles.genderChipActive]}
          >
            <Text style={[styles.genderText, value === g && styles.genderTextActive]}>{g}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listLabel}>{label}</Text>
      <Text style={styles.listValue}>{value}</Text>
    </View>
  );
}

/** Parse DD/MM/YYYY (or DD-MM-YYYY) → ISO YYYY-MM-DD, or null. */
function parseDob(input) {
  const m = String(input || '').trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== Number(y)) return null;
  return iso;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  imageContainer: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  heroImage: { width: '60%', height: 120, resizeMode: 'contain' },
  body: { padding: spacing.xl, paddingBottom: spacing.xxl },

  title: { ...typography.display, color: '#990000', marginTop: spacing.sm, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 4, marginBottom: spacing.xl, textAlign: 'center' },

  dots: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, justifyContent: 'center' },
  dot: { height: 4, width: 40, borderRadius: 999 },
  dotActive: { backgroundColor: '#990000' },
  dotIdle: { backgroundColor: colors.border },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.redSoft, borderColor: '#fecaca', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  errorIcon: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.red,
    color: '#fff', textAlign: 'center', fontWeight: '900', lineHeight: 20,
  },
  errorText: { flex: 1, color: '#991b1b', ...typography.bodyBold },

  infoBox: {
    backgroundColor: '#fffbeb', borderColor: '#FFD700', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  infoText: { color: '#b45309', ...typography.bodyBold },

  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  linkMuted: { color: colors.textMuted, ...typography.body },
  linkBold: { color: '#990000', fontWeight: '800' },
  linkDisabled: { color: colors.textFaint },

  backLink: { alignSelf: 'flex-start' },
  backLinkText: { ...typography.captionBold, color: colors.textMuted },

  // Voter details modern list layout
  voterCard: {
    paddingVertical: spacing.sm,
  },
  voterBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs,
  },
  voterBadgeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#990000',
  },
  voterBadge: {
    ...typography.captionBold, color: '#990000', letterSpacing: 1,
  },
  voterName: { ...typography.display, fontSize: 26, color: colors.text, marginTop: spacing.xs },
  voterEpic: { ...typography.bodyBold, color: colors.textMuted, marginTop: 2, letterSpacing: 1 },
  voterList: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listLabel: {
    ...typography.body, color: colors.textMuted,
  },
  listValue: {
    ...typography.bodyBold, color: colors.text, textAlign: 'right', flex: 1, marginLeft: spacing.md,
  },
  voterDisclaimer: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  // Registering-as banner on OTP step
  regAsBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#f5f5f4', borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  regAsLabel: { ...typography.captionBold, color: colors.textFaint, letterSpacing: 0.6 },
  regAsName: { ...typography.bodyBold, color: colors.text, marginTop: 2 },
  regAsEdit: { ...typography.bodyBold, color: '#990000' },

  // OTP input
  otpLabel: {
    ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6,
  },
  otpInput: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    paddingVertical: 16, paddingHorizontal: spacing.md, textAlign: 'center',
    fontSize: 22, fontWeight: '800', letterSpacing: 12, color: colors.text,
  },
  otpFootRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm,
  },
  otpFootHint: { ...typography.caption, color: colors.textFaint },

  // Phone prefix
  phonePrefix: { color: colors.textMuted, fontWeight: '700' },

  // Manual-form gender chips
  fieldLabel: {
    ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6,
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderChip: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card,
  },
  genderChipActive: { borderColor: '#FFD700', backgroundColor: '#fffbeb' },
  genderText: { ...typography.bodyBold, color: colors.textMuted },
  genderTextActive: { color: '#990000' },

  bottomLink: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.xxl, paddingVertical: spacing.lg,
  },
  primaryBtn: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  primaryBtnText: { color: '#990000' },
});
