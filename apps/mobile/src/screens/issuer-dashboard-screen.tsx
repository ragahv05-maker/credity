import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  exportIssuerAuditLog,
  getIssuerCertInIncidents,
  getIssuerComplianceConsents,
  getIssuerCredentials,
  getIssuerDataRequests,
  getIssuerDeadLetterEntries,
  getIssuerQueueStats,
  getRoleProfile,
  issueCredential,
  issueCredentialViaOid4vci,
  replayIssuerDeadLetterEntry,
  revokeIssuerConsent,
  requestIssuerDataExport,
} from '../lib/api-client';
import { requireProtectedAction } from '../lib/protected-action';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface Props {
  onSwitchRole: () => void;
  onLogout: () => Promise<void>;
}

export function IssuerDashboardScreen({ onSwitchRole, onLogout }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [templateId, setTemplateId] = useState('template-1');
  const [issuerId, setIssuerId] = useState('issuer-1');
  const [recipientEmail, setRecipientEmail] = useState('student@example.com');
  const [lastIssueMode, setLastIssueMode] = useState<'oid4vci' | 'legacy' | null>(null);
  const [lastIssueCredentialId, setLastIssueCredentialId] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [deadLetterEntries, setDeadLetterEntries] = useState<any[]>([]);
  const [complianceConsents, setComplianceConsents] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [certInIncidents, setCertInIncidents] = useState<any[]>([]);
  const [auditIntegrity, setAuditIntegrity] = useState<string | null>(null);
  const [lastReplayJob, setLastReplayJob] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [nextProfile, nextCredentials, nextQueueStats, nextDeadLetter, nextConsents, nextDataRequests, nextIncidents] = await Promise.all([
        getRoleProfile('issuer'),
        getIssuerCredentials(),
        getIssuerQueueStats().catch(() => null),
        getIssuerDeadLetterEntries(10).catch(() => []),
        getIssuerComplianceConsents().catch(() => []),
        getIssuerDataRequests().catch(() => []),
        getIssuerCertInIncidents().catch(() => []),
      ]);
      setProfile(nextProfile);
      setCredentials(nextCredentials);
      setQueueStats(nextQueueStats);
      setDeadLetterEntries(Array.isArray(nextDeadLetter) ? nextDeadLetter : []);
      setComplianceConsents(Array.isArray(nextConsents) ? nextConsents : []);
      setDataRequests(Array.isArray(nextDataRequests) ? nextDataRequests : []);
      setCertInIncidents(Array.isArray(nextIncidents) ? nextIncidents : []);
    } catch (error: any) {
      Alert.alert('Load failed', error?.message || 'Unable to load issuer data.');
    } finally {
      setLoading(false);
    }
  }

  async function onIssue() {
    const payload = {
      tenantId,
      templateId,
      issuerId,
      recipient: { email: recipientEmail, name: recipientEmail.split('@')[0] || 'Recipient' },
      credentialData: {
        source: 'mobile-mvp',
        requestedAt: new Date().toISOString(),
      },
    };

    try {
      const approved = await requireProtectedAction('Approve credential issuance');
      if (!approved) {
        Alert.alert('Issuance blocked', 'Biometric verification is required to issue credentials.');
        return;
      }

      let issuedMode: 'oid4vci' | 'legacy' = 'oid4vci';
      let issuedCredentialId: string | null = null;
      let fallbackReason = '';

      try {
        const oid4vciResult = await issueCredentialViaOid4vci({
          ...payload,
          format: 'sd-jwt-vc',
        });
        issuedCredentialId = oid4vciResult.credentialId;
      } catch (oidError: any) {
        fallbackReason = oidError?.message || 'unknown error';
        const fallbackAllowed =
          fallbackReason.includes('[oid4vci:offer]') || fallbackReason.includes('[oid4vci:token]');

        if (!fallbackAllowed) {
          throw oidError;
        }

        issuedMode = 'legacy';
        const legacyResult = await issueCredential(payload);
        issuedCredentialId = legacyResult?.id || null;
      }

      setLastIssueMode(issuedMode);
      setLastIssueCredentialId(issuedCredentialId);

      if (issuedMode === 'legacy') {
        Alert.alert(
          'Issued (fallback)',
          `OID4VCI unavailable: ${fallbackReason}. Credential issued via legacy route.`,
        );
      }

      await refresh();
      if (issuedMode === 'oid4vci') {
        Alert.alert('Issued', 'Credential issued via OID4VCI flow.');
      }
    } catch (error: any) {
      Alert.alert('Issue failed', error?.message || 'Unable to issue credential.');
    }
  }

  async function onReplayFirstDeadLetter() {
    const entryId = deadLetterEntries[0]?.id;
    if (!entryId) {
      Alert.alert('No entries', 'Dead-letter queue has no replayable entries.');
      return;
    }

    try {
      const approved = await requireProtectedAction('Replay queue dead-letter job');
      if (!approved) {
        Alert.alert('Replay blocked', 'Biometric verification is required to replay queue jobs.');
        return;
      }

      const replay = await replayIssuerDeadLetterEntry(String(entryId));
      setLastReplayJob(String(replay?.jobId || replay?.replayedJobId || 'queued'));
      await refresh();
      Alert.alert('Replay submitted', 'Dead-letter job replay queued.');
    } catch (error: any) {
      Alert.alert('Replay failed', error?.message || 'Unable to replay dead-letter entry.');
    }
  }

  async function onComplianceExport() {
    try {
      const response = await requestIssuerDataExport(recipientEmail.trim() || 'mobile-subject', 'mobile_issuer_export');
      Alert.alert('Export requested', `Request ID: ${response?.id || 'accepted'}`);
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Unable to submit export request.');
    }
  }

  async function onAuditExport() {
    try {
      const exported = await exportIssuerAuditLog('json');
      const valid = exported?.integrity?.valid;
      setAuditIntegrity(typeof valid === 'boolean' ? (valid ? 'valid' : 'invalid') : 'unknown');
      Alert.alert('Audit export ready', `Events exported: ${exported?.count ?? 0}`);
    } catch (error: any) {
      Alert.alert('Audit export failed', error?.message || 'Unable to export audit log.');
    }
  }

  async function onRevokeFirstConsent() {
    const consentId = complianceConsents[0]?.id;
    if (!consentId) {
      Alert.alert('No consent', 'No consent available to revoke.');
      return;
    }

    try {
      const approved = await requireProtectedAction('Approve issuer consent revocation');
      if (!approved) {
        Alert.alert('Revocation blocked', 'Biometric verification is required.');
        return;
      }
      await revokeIssuerConsent(String(consentId));
      await refresh();
      Alert.alert('Consent revoked', `Consent ${consentId} revoked successfully.`);
    } catch (error: any) {
      Alert.alert('Revocation failed', error?.message || 'Unable to revoke consent.');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Issuer Console</Text>
          <Text style={styles.title}>Issue credentials</Text>
          <Text style={styles.subtitle}>Issue, revoke, and audit verifiable credentials.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={styles.smallButton} onPress={onSwitchRole}>
            <Text style={styles.smallButtonText}>Switch</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, styles.danger]} onPress={onLogout}>
            <Text style={styles.smallButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>User</Text>
        <Text style={styles.meta}>Username: {profile?.username || 'n/a'}</Text>
        <Text style={styles.meta}>Role: {profile?.role || 'issuer'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Issue Credential</Text>
        <TextInput style={styles.input} value={tenantId} onChangeText={setTenantId} placeholder="Tenant ID" placeholderTextColor={colors.muted} />
        <TextInput style={styles.input} value={templateId} onChangeText={setTemplateId} placeholder="Template ID" placeholderTextColor={colors.muted} />
        <TextInput style={styles.input} value={issuerId} onChangeText={setIssuerId} placeholder="Issuer ID" placeholderTextColor={colors.muted} />
        <TextInput style={styles.input} value={recipientEmail} onChangeText={setRecipientEmail} placeholder="Recipient Email" placeholderTextColor={colors.muted} />
        <Text style={styles.meta}>Preferred flow: OID4VCI (auto-fallback to legacy)</Text>
        {lastIssueMode ? <Text style={styles.meta}>Last issue mode: {lastIssueMode}</Text> : null}
        {lastIssueCredentialId ? <Text style={styles.meta}>Last credential ID: {lastIssueCredentialId}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={onIssue}>
          <Text style={styles.primaryButtonText}>Issue</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Credentials</Text>
        {loading ? <ActivityIndicator color={colors.issuer} /> : null}
        {!credentials.length ? <Text style={styles.meta}>No credentials found.</Text> : null}
        {credentials.slice(0, 5).map((cred) => (
          <View key={String(cred.id)} style={styles.rowItem}>
            <Text style={styles.rowTitle}>#{cred.id}</Text>
            <Text style={styles.meta}>{cred?.recipient?.name || cred?.recipient || 'Recipient'}</Text>
          </View>
        ))}
        <Pressable style={styles.primaryButton} onPress={refresh}>
          <Text style={styles.primaryButtonText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Queue Operations</Text>
        <Text style={styles.meta}>
          Queue available: {queueStats?.queue?.available === false ? 'no' : 'yes'}
        </Text>
        <Text style={styles.meta}>Dead-letter entries: {deadLetterEntries.length}</Text>
        <Text style={styles.meta}>Last replay job: {lastReplayJob || 'none'}</Text>
        <Pressable style={styles.primaryButton} onPress={onReplayFirstDeadLetter}>
          <Text style={styles.primaryButtonText}>Replay latest dead-letter</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Compliance</Text>
        <Text style={styles.meta}>Active consents: {complianceConsents.length}</Text>
        <Text style={styles.meta}>Data requests: {dataRequests.length}</Text>
        <Text style={styles.meta}>CERT-In incidents: {certInIncidents.length}</Text>
        <Text style={styles.meta}>Audit chain: {auditIntegrity || 'not exported'}</Text>
        <Pressable style={styles.primaryButton} onPress={onComplianceExport}>
          <Text style={styles.primaryButtonText}>Submit export request</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onRevokeFirstConsent}>
          <Text style={styles.secondaryButtonText}>Revoke latest consent</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onAuditExport}>
          <Text style={styles.secondaryButtonText}>Export audit log</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12 },
    headerButtons: { flexDirection: 'row' as const, gap: 8 },
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
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 8,
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    cardTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 16 },
    meta: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    rowItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowTitle: { color: colors.text, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
    input: {
      backgroundColor: colors.input,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: 'Inter_400Regular',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center' as const,
      marginTop: 4,
    },
    primaryButtonText: { color: 'white', fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    secondaryButton: {
      backgroundColor: colors.input,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center' as const,
    },
    secondaryButtonText: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    smallButton: {
      backgroundColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    danger: { backgroundColor: colors.danger },
    smallButtonText: { color: 'white', fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  });
}
