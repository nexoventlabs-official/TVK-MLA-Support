import { Image } from 'expo-image';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Alert, TextInput } from 'react-native';;
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
        style={{ flex: 1, justifyContent: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brandBlock}>
          <Image source={require('../../assets/vijay.png')} style={styles.heroImage} />
          <Text style={styles.brand}>தமிழக வெற்றிக் கழகம்</Text>
          <Text style={styles.brandSub}>MYLAPORE CITIZEN PORTAL</Text>
        </View>

        <View style={styles.card}>
          {mode === 'citizen' ? (
            <CitizenForm navigation={navigation} onSwitchToAdmin={() => setMode('admin')} />
          ) : (
            <AdminForm onBack={() => setMode('citizen')} />
          )}
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

function CitizenForm({ navigation, onSwitchToAdmin }) {
  const { signInUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const otpRef = useRef(null);

  const normalisedPhone = phone.replace(/\D/g, '');
  const canSend = normalisedPhone.length === 10 && !sending;
  const canVerify = otp.length === 6 && !verifying;

  const sendOtp = async () => {
    if (normalisedPhone === '0000000000') {
      onSwitchToAdmin();
      return;
    }
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
        label="Mobile Number"
        placeholder="10-digit phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(v) => setPhone(v)}
        editable={step === 'phone'}
        maxLength={10}
      />
      {step === 'otp' && (
        <View style={{ marginTop: spacing.md }}>
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
          <Text style={styles.otpFootHint}>Code sent on WhatsApp to {normalisedPhone}</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ marginTop: spacing.lg }}>
        {step === 'phone' ? (
          <Button label="Send OTP" onPress={sendOtp} disabled={!canSend} loading={sending} style={styles.primaryBtn} textStyle={styles.primaryBtnText} />
        ) : (
          <>
            <Button label="Verify & Sign In" onPress={verifyOtp} disabled={!canVerify} loading={verifying} style={styles.primaryBtn} textStyle={styles.primaryBtnText} />
            <Button
              label="Use different number"
              variant="ghost"
              onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
              style={{ marginTop: spacing.xs }}
              textStyle={{ color: '#990000' }}
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

function AdminForm({ onBack }) {
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
        <Button label="Sign In" onPress={submit} disabled={!canSubmit} loading={signing} style={styles.primaryBtn} textStyle={styles.primaryBtnText} />
        <Button label="Back to Citizen Login" variant="ghost" onPress={onBack} style={{ marginTop: spacing.xs }} textStyle={{ color: '#990000' }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  brandBlock: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  heroImage: {
    width: '60%',
    height: 120,
    resizeMode: 'contain',
    marginBottom: spacing.md,
  },
  brand: { fontSize: 24, fontWeight: '900', color: '#990000', letterSpacing: 1 },
  brandSub: { color: colors.textMuted, letterSpacing: 2, fontSize: 10, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: '#f5f5f5',
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: '#FFD700' },
  tabLabel: { color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  tabLabelActive: { color: '#990000' },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  error: { ...typography.caption, color: colors.red, marginTop: spacing.sm },
  footer: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  altLink: { color: colors.textMuted, fontSize: 13 },
  altLinkBold: { color: '#990000', fontWeight: '700' },
  primaryBtn: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  primaryBtnText: { color: '#990000' },
  otpLabel: {
    ...typography.captionBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6,
  },
  otpInput: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    paddingVertical: 16, paddingHorizontal: spacing.md, textAlign: 'center',
    fontSize: 22, fontWeight: '800', letterSpacing: 12, color: colors.text,
  },
  otpFootHint: { ...typography.caption, color: colors.textFaint, marginTop: spacing.xs },
});
