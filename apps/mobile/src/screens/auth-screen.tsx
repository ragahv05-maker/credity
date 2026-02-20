/**
 * Auth Screen
 * Extended by Agent 1 — PRD §1.5, §1.6, §1.7
 *
 * Additions:
 * - "Continue with Google" button (opens BACKEND_URL/auth/google in expo-web-browser)
 * - "Continue with Apple" button (iOS only — placeholder)
 * - "Use Phone Number" toggle — swaps username for phone + "Send OTP" flow
 * - "Forgot Password?" link → navigates to ForgotPasswordScreen
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { loginRole, registerRole, restoreRoleSession, sendPhoneOtp, verifyPhoneOtp } from '../lib/api-client';
import { useSessionStore } from '../store/session-store';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';
import type { AppRole } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const BACKEND_URL = (process.env.EXPO_PUBLIC_WALLET_URL ?? 'http://localhost:5000').replace(/\/$/, '');

WebBrowser.maybeCompleteAuthSession();

const roleText: Record<AppRole, string> = {
  holder: 'Holder Wallet',
  issuer: 'Issuer Console',
  recruiter: 'Recruiter Verify',
};

export function AuthScreen() {
  const role = useSessionStore((s) => s.activeRole);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Phone OTP flow
  const [usePhone, setUsePhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const title = useMemo(() => {
    if (!role) return 'Authenticate';
    return `${mode === 'login' ? 'Sign in to' : 'Create'} ${roleText[role]}`;
  }, [mode, role]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap(): Promise<void> {
      if (!role) {
        setBootstrapping(false);
        return;
      }
      setBootstrapping(true);
      try {
        await restoreRoleSession(role);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [role]);

  // Reset phone state when toggling
  useEffect(() => {
    setPhone('');
    setOtpCode('');
    setOtpSent(false);
  }, [usePhone]);

  async function onSubmit() {
    if (!role) return;
    if (!username || !password) {
      Alert.alert('Missing fields', 'Username and password are required.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginRole(role, username.trim(), password);
      } else {
        await registerRole(role, {
          username: username.trim(),
          password,
          email: email.trim() || undefined,
          name: name.trim() || undefined,
        });
      }
    } catch (error: any) {
      Alert.alert('Authentication failed', error?.message || 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  }

  async function onSendPhoneOtp() {
    if (!phone.trim()) {
      Alert.alert('Missing field', 'Please enter your phone number.');
      return;
    }
    setOtpLoading(true);
    try {
      await sendPhoneOtp(phone.trim());
      setOtpSent(true);
      Alert.alert('OTP Sent', 'Check your phone for the 6-digit code.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function onVerifyPhoneOtp() {
    if (!otpCode.trim()) {
      Alert.alert('Missing field', 'Please enter the OTP code.');
      return;
    }
    setOtpLoading(true);
    try {
      await verifyPhoneOtp(phone.trim(), otpCode.trim());
      Alert.alert('Phone Verified', 'Your phone number has been verified.');
      setOtpSent(false);
      setUsePhone(false);
    } catch (err: any) {
      Alert.alert('Verification failed', err?.message || 'Invalid or expired OTP.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function onGoogleSignIn() {
    try {
      const url = `${BACKEND_URL}/api/auth/google`;
      await WebBrowser.openAuthSessionAsync(url, 'credverse://auth/callback');
      // Token pickup from deep link is handled via expo-linking in App.tsx
    } catch (err: any) {
      Alert.alert('Google Sign-In failed', err?.message || 'Unable to open Google sign-in.');
    }
  }

  function onAppleSignIn() {
    // TODO: Implement with expo-apple-authentication (Sign in with Apple capability required)
    Alert.alert('Coming soon', 'Apple Sign-In will be available in the next release.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Secure access</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Sessions are isolated by role. Switch anytime.</Text>

      {bootstrapping ? (
        <View style={styles.bootstrapRow}>
          <ActivityIndicator color={colors.issuer} />
          <Text style={styles.bootstrapText}>Checking saved session...</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        {mode === 'register' && (
          <TextInput
            placeholder="Display name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        )}

        {mode === 'register' && (
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
            style={styles.input}
          />
        )}

        {!usePhone ? (
          <TextInput
            placeholder="Username"
            placeholderTextColor={colors.muted}
            value={username}
            autoCapitalize="none"
            onChangeText={setUsername}
            style={styles.input}
          />
        ) : (
          <>
            <TextInput
              placeholder="Phone number (e.g. +91 98765 43210)"
              placeholderTextColor={colors.muted}
              value={phone}
              keyboardType="phone-pad"
              onChangeText={setPhone}
              style={styles.input}
            />
            {otpSent && (
              <TextInput
                placeholder="6-digit OTP"
                placeholderTextColor={colors.muted}
                value={otpCode}
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setOtpCode}
                style={styles.input}
              />
            )}
            <TouchableOpacity
              onPress={otpSent ? onVerifyPhoneOtp : onSendPhoneOtp}
              style={[styles.primaryButton, styles.phonOtpButton]}
              disabled={otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{otpSent ? 'Verify OTP' : 'Send OTP'}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.muted}
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          style={styles.input}
        />

        <Pressable onPress={onSubmit} style={styles.primaryButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          )}
        </Pressable>

        {mode === 'login' && (
          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        )}

        <Pressable onPress={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}>
          <Text style={styles.linkText}>
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>

        <Pressable onPress={() => setUsePhone((v) => !v)}>
          <Text style={styles.linkText}>
            {usePhone ? '← Use Username Instead' : '📱 Use Phone Number'}
          </Text>
        </Pressable>
      </View>

      {/* Social sign-in */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignIn} activeOpacity={0.85}>
        <Text style={styles.googleButtonText}>🌐  Continue with Google</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.appleButton} onPress={onAppleSignIn} activeOpacity={0.85}>
          <Text style={styles.appleButtonText}> Continue with Apple</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 72,
    gap: 10,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  bootstrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bootstrapText: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  input: {
    backgroundColor: colors.input,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  phonOtpButton: {
    backgroundColor: '#6366F1', // intentionally distinct from primary (indigo OTP)
    marginTop: 0,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  forgotText: {
    color: colors.primary,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  linkText: {
    color: colors.muted,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  googleButton: {
    backgroundColor: '#4285F4', // Google brand color
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  appleButton: {
    backgroundColor: '#000000', // Apple brand color
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  appleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  });
}
