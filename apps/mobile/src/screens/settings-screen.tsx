import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { submitHolderDataExport, submitHolderDataDelete } from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const canGoBack = navigation.canGoBack();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [sharePrompts, setSharePrompts] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const exportMutation = useMutation({
    mutationFn: () => submitHolderDataExport(),
    onSuccess: () => {
      setShowExport(false);
      Alert.alert('Export requested', 'Your data package will be ready within 72 hours.');
    },
    onError: () => {
      Alert.alert('Error', 'Could not submit export request. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => submitHolderDataDelete(),
    onSuccess: () => {
      setShowDelete(false);
      Alert.alert('Deletion requested', 'Your account will be deleted within 30 days.');
    },
    onError: () => {
      Alert.alert('Error', 'Could not submit deletion request. Please try again.');
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Settings</Text>
            <Text style={styles.title}>Privacy & control</Text>
            <Text style={styles.subtitle}>Manage consent, exports, and security preferences.</Text>
          </View>
          {canGoBack ? (
            <Pressable
              style={styles.backButton}
              onPress={() => {
                Haptics.selectionAsync();
                (navigation as any).goBack();
              }}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consent & sharing</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Prompt before sharing</Text>
              <Text style={styles.settingSubtitle}>Always show consent preview before sharing data.</Text>
            </View>
            <Switch
              value={sharePrompts}
              onValueChange={setSharePrompts}
              trackColor={{ false: colors.surfaceMuted, true: `${colors.primary}40` }}
              thumbColor={sharePrompts ? colors.primary : colors.muted}
            />
          </View>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Biometric confirmations</Text>
              <Text style={styles.settingSubtitle}>Require biometrics for sharing or revoking access.</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: colors.surfaceMuted, true: `${colors.success}40` }}
              thumbColor={biometricEnabled ? colors.success : colors.muted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data rights</Text>
          <Text style={styles.meta}>Export or remove your data at any time.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowExport(true);
            }}
          >
            <Text style={styles.primaryButtonText}>Request data export</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDelete(true);
            }}
          >
            <Text style={styles.secondaryButtonText}>Request account deletion</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Audit retention</Text>
          <Text style={styles.meta}>Audit logs are retained for 180 days for compliance.</Text>
          <Text style={styles.meta}>You can revoke consent grants instantly in the activity log.</Text>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={showExport}
        animationType="slide"
        onRequestClose={() => {
          Haptics.selectionAsync();
          setShowExport(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Export your data</Text>
            <Text style={styles.modalSubtitle}>
              We will prepare your data package and notify you within 72 hours.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowExport(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, exportMutation.isPending && { opacity: 0.6 }]}
                disabled={exportMutation.isPending}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  exportMutation.mutate();
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {exportMutation.isPending ? 'Requesting...' : 'Confirm export'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDelete}
        animationType="slide"
        onRequestClose={() => {
          Haptics.selectionAsync();
          setShowDelete(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request deletion</Text>
            <Text style={styles.modalSubtitle}>
              Deletion revokes all active share grants. Audit logs are retained for compliance.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowDelete(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Keep account</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, deleteMutation.isPending && { opacity: 0.6 }]}
                disabled={deleteMutation.isPending}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  deleteMutation.mutate();
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {deleteMutation.isPending ? 'Requesting...' : 'Request deletion'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12 },
    kicker: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700' as const,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    title: { color: colors.text, fontSize: 26, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    subtitle: { color: colors.muted, marginTop: 4, maxWidth: 220, fontFamily: 'Inter_400Regular' },
    backButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    backText: { color: colors.primary, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    cardTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 16 },
    meta: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    settingRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12 },
    settingTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 14 },
    settingSubtitle: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, maxWidth: 220 },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center' as const,
      marginTop: 4,
    },
    primaryButtonText: { color: 'white', fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    secondaryButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center' as const,
      marginTop: 4,
    },
    secondaryButtonText: { color: colors.primary, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end' as const,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      gap: 12,
    },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    modalSubtitle: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    modalActions: { flexDirection: 'row' as const, gap: 12, justifyContent: 'space-between' as const },
  });
}
