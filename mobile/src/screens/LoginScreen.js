import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import * as authApi from '../api/auth';

/**
 * Single unified login screen. Top tabs swap between:
 *   - Citizen (phone + OTP)  — uses /portal/auth/{send-otp,verify-otp}
 *   - Admin   (user + pass)  — uses /auth/login
 *
 * After successful auth, AuthContext.role flips and the root navigator
 * swaps in the correct stack — nothing for this screen to push.
 */
export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('citizen'); // 'citizen' | 'admin'
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>TVK</Text>
          <Text style={styles.brandSub}>MYLAPORE</Text>
        </View>

        <View style={styles.tabs}>
          <TabButton label="Citizen" active={mode === 'citizen'} onPress={() => setMode('citizen')} />
          <TabButton label="Admin" active={mode === 'admin'} onPress={() => setMode('admin')} />
        </View>

        <View style={styles.card}>
          {mode === 'citizen' ? <CitizenForm navigation={navigation} /> : <AdminForm />}
        </View>

        <Text style={styles.footer}>
          {mode === 'citizen'
            ? 'Use the same phone number you registered with TVK Mylapore.'
            : 'Only authorised TVK Mylapore staff can sign in here.'}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function CitizenForm({ navigation }) {
  const { signInUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const otpRef = useRef(null);

  const normalisedPhone = phone.replace(/\D/g, '');
  const canSend = normalisedPhone.length >= 10 && !sending;
  const canVerify = otp.length === 6 && !verifying;

  const sendOtp = async () => {
    setError('');
    setSending(true);
    try {
      await authApi.portalSendOtp(normalisedPhone, 'login');
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      const msg = err.message || 'Could not send OTP';
      // Backend returns NOT_REGISTERED if the phone is not in the Members
      // collection. Push the user to Register in that case.
      if (msg.toLowerCase().includes('not registered') || err.response?.data?.code === 'NOT_REGISTERED') {
        Alert.alert(
          'Not registered',
          `We could not find ${normalisedPhone} in our records. Register a new account?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => navigation.navigate('Register', { phone: normalisedPhone }) },
          ]
        );
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setVerifying(true);
    try {
      const data = await authApi.portalVerifyOtp(normalisedPhone, otp);
      await signInUser(data);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Input
        label="WhatsApp Number"
        placeholder="10-digit phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(v) => setPhone(v)}
        editable={step === 'phone'}
        maxLength={15}
      />
      {step === 'otp' && (
        <Input
          ref={otpRef}
          label="OTP"
          placeholder="6-digit code"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          hint={`Code sent on WhatsApp to ${normalisedPhone}`}
          style={{ marginTop: spacing.md }}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ marginTop: spacing.lg }}>
        {step === 'phone' ? (
          <Button label="Send OTP" onPress={sendOtp} disabled={!canSend} loading={sending} />
        ) : (
          <>
            <Button label="Verify & Sign In" onPress={verifyOtp} disabled={!canVerify} loading={verifying} />
            <Button
              label="Use different number"
              variant="ghost"
              onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
              style={{ marginTop: spacing.xs }}
            />
          </>
        )}
      </View>

      <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.md, alignSelf: 'center' }}>
        <Text style={styles.altLink}>
          New here? <Text style={styles.altLinkBold}>Create account</Text>
        </Text>
      </Pressable>
    </>
  );
}

function AdminForm() {
  const { signInAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = username.trim() && password && !signing;

  const submit = async () => {
    setError('');
    setSigning(true);
    try {
      await signInAdmin(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setSigning(false);
    }
  };

  return (
    <>
      <Input
        label="Username"
        placeholder="e.g. admin"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <Input
        label="Password"
        placeholder="Your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ marginTop: spacing.md }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ marginTop: spacing.lg }}>
        <Button label="Sign In" onPress={submit} disabled={!canSubmit} loading={signing} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand800 },
  brandBlock: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  brand: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: 6 },
  brandSub: { color: colors.brand200, letterSpacing: 4, fontSize: 12, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.brand700,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: '#fff' },
  tabLabel: { color: colors.brand100, fontWeight: '700', letterSpacing: 0.5 },
  tabLabelActive: { color: colors.brand800 },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  error: { ...typography.caption, color: colors.red, marginTop: spacing.sm },
  footer: {
    color: colors.brand200,
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  altLink: { color: colors.textMuted, fontSize: 13 },
  altLinkBold: { color: colors.brand700, fontWeight: '700' },
});
