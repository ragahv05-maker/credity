import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  exportRecruiterAuditLog,
  getRecruiterCertInIncidents,
  getRecruiterComplianceConsents,
  getRecruiterDataRequests,
  getRecruiterVerificationDetail,
  getRecruiterVerifications,
  getRoleProfile,
  revokeRecruiterConsent,
  requestRecruiterDataExport,
  verifyRecruiterInstant,
} from '../lib/api-client';
import { requireProtectedAction } from '../lib/protected-action';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface Props {
  onSwitchRole: () => void;
  onLogout: () => Promise<void>;
}

export function RecruiterDashboardScreen({ onSwitchRole, onLogout }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [jwtInput, setJwtInput] = useState('');
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const [complianceConsents, setComplianceConsents] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [certInIncidents, setCertInIncidents] = useState<any[]>([]);
  const [auditIntegrity, setAuditIntegrity] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [nextProfile, nextRecords, nextConsents, nextDataRequests, nextIncidents] = await Promise.all([
        getRoleProfile('recruiter'),
        getRecruiterVerifications(),
        getRecruiterComplianceConsents().catch(() => []),
        getRecruiterDataRequests().catch(() => []),
        getRecruiterCertInIncidents().catch(() => []),
      ]);
      setProfile(nextProfile);
      setRecords(nextRecords);
      setComplianceConsents(Array.isArray(nextConsents) ? nextConsents : []);
      setDataRequests(Array.isArray(nextDataRequests) ? nextDataRequests : []);
      setCertInIncidents(Array.isArray(nextIncidents) ? nextIncidents : []);
    } catch (error: any) {
      Alert.alert('Load failed', error?.message || 'Unable to load recruiter data.');
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    if (!jwtInput.trim()) {
      Alert.alert('Input required', 'Paste JWT or credential payload to verify.');
      return;
    }

    try {
      const approved = await requireProtectedAction('Approve recruiter verification');
      if (!approved) {
        Alert.alert('Verification blocked', 'Biometric verification is required for instant verify.');
        return;
      }

      const trimmed = jwtInput.trim();
      let result;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        let parsed: any;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          throw new Error('Invalid JSON payload. Paste a JWT string or a JSON object.');
        }

        // Support holder "recruiter package" wrapper.
        const credential = parsed?.credential || parsed;
        result = await verifyRecruiterInstant({ credential });
      } else {
        result = await verifyRecruiterInstant({ jwt: trimmed });
      }
      const decision =
        result?.decision || result?.v1?.decision || result?.fraud?.recommendation || result?.verification?.status || 'completed';
      setLastDecision(String(decision));
      setJwtInput('');
      await refresh();
    } catch (error: any) {
      Alert.alert('Verify failed', error?.message || 'Unable to run instant verification.');
    }
  }

  async function onSelectRecord(id: string) {
    try {
      const detail = await getRecruiterVerificationDetail(id);
      setSelectedVerification(detail);
    } catch (error: any) {
      Alert.alert('Detail failed', error?.message || 'Unable to fetch verification detail.');
    }
  }

  async function onComplianceExport() {
    const subjectId = selectedVerification?.subject || profile?.username || 'mobile-subject';
    try {
      await requestRecruiterDataExport(String(subjectId), 'mobile_recruiter_export');
      Alert.alert('Export requested', `Submitted for subject: ${subjectId}`);
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Unable to submit recruiter export request.');
    }
  }

  async function onAuditExport() {
    try {
      const exported = await exportRecruiterAuditLog('json');
      const valid = exported?.integrity?.valid;
      setAuditIntegrity(typeof valid === 'boolean' ? (valid ? 'valid' : 'invalid') : 'unknown');
      Alert.alert('Audit export ready', `Events exported: ${exported?.count ?? 0}`);
    } catch (error: any) {
      Alert.alert('Audit export failed', error?.message || 'Unable to export recruiter audit log.');
    }
  }

  async function onRevokeFirstConsent() {
    const consentId = complianceConsents[0]?.id;
    if (!consentId) {
      Alert.alert('No consent', 'No consent available to revoke.');
      return;
    }

    try {
      const approved = await requireProtectedAction('Approve recruiter consent revocation');
      if (!approved) {
        Alert.alert('Revocation blocked', 'Biometric verification is required.');
        return;
      }
      await revokeRecruiterConsent(String(consentId));
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
          <Text style={styles.kicker}>Recruiter Verify</Text>
          <Text style={styles.title}>Instant verification</Text>
          <Text style={styles.subtitle}>Run checks with clear, auditable risk signals.</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Instant Verification</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          value={jwtInput}
          onChangeText={setJwtInput}
          placeholder="Paste JWT or VC payload"
          placeholderTextColor={colors.muted}
        />
        <Pressable style={styles.primaryButton} onPress={onVerify}>
          <Text style={styles.primaryButtonText}>Verify</Text>
        </Pressable>
        {lastDecision ? <Text style={styles.meta}>Last decision: {lastDecision}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Verifications</Text>
        {loading ? <ActivityIndicator color={colors.recruiter} /> : null}
        {!records.length ? <Text style={styles.meta}>No verification history available.</Text> : null}
        {records.slice(0, 5).map((row) => (
          <Pressable key={String(row.id)} style={styles.rowItem} onPress={() => onSelectRecord(String(row.id))}>
            <Text style={styles.rowTitle}>{row.subject || 'Unknown subject'}</Text>
            <Text style={styles.meta}>{row.status || row.recommendation || 'pending'}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.primaryButton} onPress={refresh}>
          <Text style={styles.primaryButtonText}>Refresh</Text>
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

      {selectedVerification ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification Detail</Text>
          <Text style={styles.meta}>ID: {selectedVerification?.id || 'n/a'}</Text>
          <Text style={styles.meta}>Status: {selectedVerification?.status || 'n/a'}</Text>
          <Text style={styles.meta}>Issuer: {selectedVerification?.issuer || 'n/a'}</Text>
          <Text style={styles.meta}>Subject: {selectedVerification?.subject || 'n/a'}</Text>
          <Text style={styles.meta}>Risk Score: {String(selectedVerification?.risk_score ?? selectedVerification?.riskScore ?? 'n/a')}</Text>
          <Text style={styles.meta}>Fraud Score: {String(selectedVerification?.fraud_score ?? selectedVerification?.fraudScore ?? 'n/a')}</Text>
          <Text style={styles.meta}>Recommendation: {selectedVerification?.recommendation || 'n/a'}</Text>
        </View>
      ) : null}
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
    textarea: {
      minHeight: 96,
      textAlignVertical: 'top' as const,
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
