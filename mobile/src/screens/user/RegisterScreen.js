import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, radius, typography } from '../../theme';
import * as authApi from '../../api/auth';

/**
 * Three-step registration mirroring the web portal RegisterPage:
 *   1. Phone   — send OTP (mode='register')
 *   2. OTP     — verify code, no JWT yet
 *   3. Profile — name + DOB + gender (manual) OR EPIC (auto)
 *      → POST /auth/register, JWT issued, signed in.
 */
export default function RegisterScreen({ route, navigation }) {
  const { signInUser } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'profile'
  const [phone, setPhone] = useState(route?.params?.phone || '');
  const [otp, setOtp] = useState('');
  const [path, setPath] = useState('manual'); // 'manual' | 'epic'

  // profile fields
  const [name, setName] = useState('');
  const [dob, setDob] = useState(''); // 'DD-MM-YYYY' input → ISO on submit
  const [gender, setGender] = useState('');
  const [epic, setEpic] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const normalisedPhone = phone.replace(/\D/g, '');
  const otpRef = useRef(null);

  const sendOtp = async () => {
    setError(''); setBusy(true);
    try {
      await authApi.portalSendOtp(normalisedPhone, 'register');
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      const msg = err.message || 'Could not send OTP';
      if (msg.toLowerCase().includes('already registered')) {
        Alert.alert('Already registered', `${normalisedPhone} is already registered. Please sign in instead.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else setError(msg);
    } finally { setBusy(false); }
  };

  const confirmOtp = async () => {
    // We don't actually verify OTP server-side until the final register call.
    // This step just gatekeeps the UI so users can't skip ahead.
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setStep('profile');
    setError('');
  };

  const submitProfile = async () => {
    setError('');
    if (path === 'manual') {
      if (!name.trim() || name.trim().length < 2) { setError('Enter your full name'); return; }
      if (!['Male', 'Female', 'Other'].includes(gender)) { setError('Select a gender'); return; }
    } else {
      if (!/^[A-Z]{2,3}[0-9]{6,7}$/.test(epic.trim().toUpperCase())) { setError('Invalid EPIC (e.g. TNA1234567)'); return; }
    }
    const dobIso = parseDob(dob);
    if (!dobIso) { setError('Enter DOB as DD-MM-YYYY'); return; }

    setBusy(true);
    try {
      const data = await authApi.portalRegister({
        phone: normalisedPhone,
        otp,
        dob: dobIso,
        ...(path === 'epic' ? { epic: epic.trim().toUpperCase() } : { name: name.trim(), gender }),
      });
      await signInUser(data);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top','bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Step {stepNum(step)} of 3</Text>

          {step === 'phone' && (
            <>
              <Input label="WhatsApp number" placeholder="10-digit phone" keyboardType="phone-pad"
                value={phone} onChangeText={setPhone} maxLength={15} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Send OTP" onPress={sendOtp} disabled={normalisedPhone.length < 10 || busy} loading={busy} style={{ marginTop: spacing.lg }} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Input ref={otpRef} label="Enter OTP" placeholder="6-digit code" keyboardType="number-pad"
                value={otp} onChangeText={setOtp} maxLength={6}
                hint={`Sent on WhatsApp to ${normalisedPhone}`} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Continue" onPress={confirmOtp} disabled={otp.length !== 6} style={{ marginTop: spacing.lg }} />
              <Button label="Use different number" variant="ghost"
                onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
                style={{ marginTop: spacing.xs }} />
            </>
          )}

          {step === 'profile' && (
            <>
              <View style={styles.tabs}>
                <PathTab label="Manual" active={path === 'manual'} onPress={() => setPath('manual')} />
                <PathTab label="With EPIC" active={path === 'epic'} onPress={() => setPath('epic')} />
              </View>

              {path === 'manual' ? (
                <>
                  <Input label="Full name" placeholder="As per ID" value={name} onChangeText={setName} autoCapitalize="words" />
                  <View style={{ height: spacing.md }} />
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {['Male','Female','Other'].map((g) => (
                      <Pressable key={g} onPress={() => setGender(g)}
                        style={[styles.genderChip, gender === g && styles.genderChipActive]}>
                        <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <Input label="EPIC number" placeholder="e.g. TNA1234567" value={epic} onChangeText={(v) => setEpic(v.toUpperCase())} autoCapitalize="characters" />
              )}
              <View style={{ height: spacing.md }} />
              <Input label="Date of birth" placeholder="DD-MM-YYYY" value={dob} onChangeText={setDob}
                keyboardType="numbers-and-punctuation" maxLength={10}
                hint="We use this to verify the voter record" />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Create account" onPress={submitProfile} disabled={busy} loading={busy} style={{ marginTop: spacing.lg }} />
            </>
          )}

          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
            <Text style={styles.altLink}>Already have an account? <Text style={styles.altLinkBold}>Sign in</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PathTab({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.pathTab, active && styles.pathTabActive]}>
      <Text style={[styles.pathTabLabel, active && styles.pathTabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function stepNum(s) { return s === 'phone' ? 1 : s === 'otp' ? 2 : 3; }

function parseDob(input) {
  // accept 'DD-MM-YYYY' or 'DD/MM/YYYY'
  const m = String(input).trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const [_, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : iso;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 2 },
  error: { ...typography.caption, color: colors.red, marginTop: spacing.sm },
  altLink: { color: colors.textMuted, fontSize: 13 },
  altLinkBold: { color: colors.brand700, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.brand100, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  pathTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.pill },
  pathTabActive: { backgroundColor: '#fff' },
  pathTabLabel: { color: colors.brand800, fontWeight: '700' },
  pathTabLabelActive: { color: colors.brand800 },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderChip: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: '#fff' },
  genderChipActive: { borderColor: colors.brand700, backgroundColor: colors.brand50 },
  genderText: { ...typography.bodyBold, color: colors.text },
  genderTextActive: { color: colors.brand700 },
});
