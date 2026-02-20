/**
 * Forgot Password Screen
 * Agent 1 — PRD §1.9, §1.10
 *
 * Step 1: Enter email → POST /auth/forgot-password
 * Step 2: Enter reset code + new password → POST /auth/reset-password
 * On success: navigate back to Auth screen with a toast
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sendForgotPasswordEmail, resetPassword } from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSendCode() {
    if (!email.trim()) {
      Alert.alert('Missing field', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendForgotPasswordEmail(email.trim());
      setStep('reset');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    if (!code.trim() || !newPassword) {
      Alert.alert('Missing fields', 'Please fill in both the reset code and your new password.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('Success', 'Your password has been reset. Please sign in.', [
        {
          text: 'Sign In',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.kicker}>Account recovery</Text>
        <Text style={styles.title}>Reset Password</Text>

        {step === 'email' ? (
          <>
            <Text style={styles.hint}>
              Enter the email address associated with your account. We'll send a reset code.
            </Text>
            <View style={styles.formCard}>
              <TextInput
                placeholder="Email address"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable onPress={onSendCode} style={styles.primaryButton} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Send Reset Code</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              A 6-digit code was sent to <Text style={styles.bold}>{email}</Text>. Enter it below along with your new password.
            </Text>
            <View style={styles.formCard}>
              <TextInput
                placeholder="6-digit reset code"
                placeholderTextColor={colors.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
              <TextInput
                placeholder="New password"
                placeholderTextColor={colors.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.input}
              />
              <Pressable onPress={onResetPassword} style={styles.primaryButton} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Reset Password</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep('email')}>
                <Text style={styles.linkText}>Didn't receive a code? Go back</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 40,
      gap: 10,
    },
    backRow: { marginBottom: 8 },
    backText: { color: colors.muted, fontSize: 14, fontFamily: 'Inter_400Regular' },
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
      marginBottom: 4,
    },
    hint: {
      color: colors.muted,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
      marginBottom: 8,
    },
    bold: { fontWeight: '700', fontFamily: 'Inter_700Bold', color: colors.text },
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
    primaryText: { color: '#fff', fontWeight: '700', fontFamily: 'Inter_700Bold' },
    linkText: { color: colors.muted, textAlign: 'center', fontFamily: 'Inter_400Regular', marginTop: 8 },
  });
}
