import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  claimHolderCredentialOffer,
  createCredentialShareQr,
  createHolderDisclosure,
  generateHolderProofMetadata,
  getHolderCertInIncidents,
  getHolderConsents,
  getHolderCredential,
  getHolderCredentialFields,
  getHolderCredentials,
  getHolderDataRequests,
  getHolderReputationScore,
  getHolderSafeDateScore,
  getHolderWalletStatus,
  getRoleProfile,
  revokeHolderConsent,
  submitHolderDataDelete,
  submitHolderDataExport,
} from '../lib/api-client';
import { requireProtectedAction } from '../lib/protected-action';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface Props {
  onSwitchRole: () => void;
  onLogout: () => Promise<void>;
}

export function HolderDashboardScreen({ onSwitchRole, onLogout }: Props) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [safeDate, setSafeDate] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [lastShareLink, setLastShareLink] = useState<string | null>(null);
  const [showZkProof, setShowZkProof] = useState(false);
  const [consents, setConsents] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [certInIncidents, setCertInIncidents] = useState<any[]>([]);

  const [offerUrl, setOfferUrl] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);

  const [showDisclosure, setShowDisclosure] = useState(false);
  const [disclosureCredentialId, setDisclosureCredentialId] = useState<string | null>(null);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [sharePayload, setSharePayload] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      did: wallet?.did || profile?.did || 'Not available',
      credentialCount: credentials.length,
      trust: wallet?.stats?.trustScore || wallet?.stats?.overall || 'n/a',
    };
  }, [credentials.length, profile?.did, wallet]);

  const scoreValue = typeof reputation?.score === 'number' ? reputation.score : null;
  const scorePercent = scoreValue ? Math.min(100, Math.max(0, Math.round((scoreValue / 1000) * 100))) : 0;
  const safeDateValue = typeof safeDate?.score === 'number' ? safeDate.score : null;

  function getTierLabel(score: number | null): string {
    if (score === null) return 'Pending';
    if (score < 500) return 'Unverified';
    if (score < 650) return 'Bronze';
    if (score < 750) return 'Silver';
    if (score < 850) return 'Gold';
    if (score < 930) return 'Platinum';
    return 'Diamond';
  }

  async function authenticateAndLoad() {
    setUnlocking(true);
    try {
      const unlocked = await requireProtectedAction('Unlock holder wallet');
      if (!unlocked) {
        Alert.alert('Unlock failed', 'Biometric verification is required to access holder dashboard.');
        return;
      }

      setLoading(true);
      const [
        nextProfile,
        nextWallet,
        nextReputation,
        nextSafeDate,
        nextCredentials,
        nextConsents,
        nextDataRequests,
        nextIncidents,
      ] = await Promise.all([
        getRoleProfile('holder'),
        getHolderWalletStatus(),
        getHolderReputationScore(),
        getHolderSafeDateScore(),
        getHolderCredentials(),
        getHolderConsents(1),
        getHolderDataRequests(1),
        getHolderCertInIncidents(),
      ]);
      setProfile(nextProfile);
      setWallet(nextWallet);
      setReputation(nextReputation || null);
      setSafeDate(nextSafeDate || null);
      setCredentials(nextCredentials);
      setConsents(nextConsents);
      setDataRequests(nextDataRequests);
      setCertInIncidents(nextIncidents);
    } catch (error: any) {
      Alert.alert('Load failed', error?.message || 'Unable to load holder data.');
    } finally {
      setUnlocking(false);
      setLoading(false);
    }
  }

  async function onGenerateShare() {
    if (!credentials.length) {
      Alert.alert('No credential', 'Add a credential before generating a share QR.');
      return;
    }

    try {
      const approved = await requireProtectedAction('Confirm credential share');
      if (!approved) {
        Alert.alert('Share blocked', 'Biometric verification is required to share credentials.');
        return;
      }

      const firstId = credentials[0]?.id;
      const share = await createCredentialShareQr(firstId);
      const maybeUrl = share?.link || share?.url || share?.verificationUrl || JSON.stringify(share);
      setLastShareLink(String(maybeUrl));
    } catch (error: any) {
      Alert.alert('Share failed', error?.message || 'Unable to generate QR/share link.');
    }
  }

  async function onSelectCredential(id: string | number) {
    try {
      const detail = await getHolderCredential(id);
      setSelectedCredential(detail);
    } catch (error: any) {
      Alert.alert('Detail failed', error?.message || 'Unable to load credential detail.');
    }
  }

  async function onClaimOffer() {
    const url = offerUrl.trim();
    if (!url) {
      Alert.alert('Offer required', 'Paste an offer URL from the Issuer to claim a credential.');
      return;
    }

    setClaimBusy(true);
    try {
      const approved = await requireProtectedAction('Claim credential offer');
      if (!approved) {
        Alert.alert('Claim blocked', 'Biometric verification is required to claim credentials.');
        return;
      }

      const result = await claimHolderCredentialOffer(url);
      setOfferUrl('');
      await authenticateAndLoad();
      Alert.alert('Credential claimed', result?.message || 'Credential stored in wallet.');
    } catch (error: any) {
      Alert.alert('Claim failed', error?.message || 'Unable to claim credential offer.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function onOpenDisclosure(credentialId: string | number) {
    try {
      setSharePayload(null);
      setDisclosureCredentialId(String(credentialId));
      setSelectedFields(new Set());
      const fieldsResponse = await getHolderCredentialFields(credentialId);
      const nextFields = (fieldsResponse?.fields || [])
        .map((f: any) => f?.path)
        .filter((value: any) => typeof value === 'string' && value.length);
      setAvailableFields(nextFields.slice(0, 24));
      setShowDisclosure(true);
    } catch (error: any) {
      Alert.alert('Fields failed', error?.message || 'Unable to load credential fields.');
    }
  }

  async function onGenerateRecruiterPackage() {
    if (!disclosureCredentialId) return;

    try {
      const approved = await requireProtectedAction('Generate selective disclosure package');
      if (!approved) {
        Alert.alert('Share blocked', 'Biometric verification is required to share credentials.');
        return;
      }

      const requestedFields = Array.from(selectedFields);
      const [disclosure, proof] = await Promise.all([
        createHolderDisclosure({ credentialId: disclosureCredentialId, requestedFields }),
        generateHolderProofMetadata(disclosureCredentialId),
      ]);

      const payload = {
        type: 'credverse.recruiter_package.v1',
        credential: disclosure?.token?.disclosedData || disclosure?.token?.disclosed_data || null,
        proof: proof?.proof || null,
        metadata: {
          credentialId: disclosureCredentialId,
          generatedAt: new Date().toISOString(),
        },
      };

      setSharePayload(JSON.stringify(payload, null, 2));
    } catch (error: any) {
      Alert.alert('Package failed', error?.message || 'Unable to generate recruiter package.');
    }
  }

  async function onRequestExport() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const approved = await requireProtectedAction('Approve data export request');
      if (!approved) {
        Alert.alert('Request blocked', 'Biometric verification is required for export requests.');
        return;
      }
      await submitHolderDataExport(1, 'mobile_export_request');
      await authenticateAndLoad();
      Alert.alert('Submitted', 'Data export request submitted.');
    } catch (error: any) {
      Alert.alert('Request failed', error?.message || 'Unable to submit data export request.');
    }
  }

  async function onRequestDelete() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const approved = await requireProtectedAction('Approve data deletion request');
      if (!approved) {
        Alert.alert('Request blocked', 'Biometric verification is required for deletion requests.');
        return;
      }
      await submitHolderDataDelete(1, 'mobile_delete_request');
      await authenticateAndLoad();
      Alert.alert('Submitted', 'Data deletion request submitted.');
    } catch (error: any) {
      Alert.alert('Request failed', error?.message || 'Unable to submit data deletion request.');
    }
  }

  async function onRevokeFirstConsent() {
    const consentId = consents[0]?.id;
    if (!consentId) {
      Alert.alert('No consent', 'No active consent to revoke.');
      return;
    }

    try {
      const approved = await requireProtectedAction('Approve consent revocation');
      if (!approved) {
        Alert.alert('Revocation blocked', 'Biometric verification is required to revoke consent.');
        return;
      }
      await revokeHolderConsent(String(consentId), 1);
      await authenticateAndLoad();
      Alert.alert('Consent revoked', `Consent ${consentId} has been revoked.`);
    } catch (error: any) {
      Alert.alert('Revocation failed', error?.message || 'Unable to revoke consent.');
    }
  }

  useEffect(() => {
    authenticateAndLoad();
  }, []);

  async function onLogoutPress() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await onLogout();
  }

  function onOpenZkProof() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowZkProof(true);
  }

  function onCloseZkProof() {
    Haptics.selectionAsync();
    setShowZkProof(false);
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Holder Wallet</Text>
          <Text style={styles.title}>Your trusted identity</Text>
          <Text style={styles.subtitle}>Manage credentials, share proofs, and control access.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={styles.smallButton} onPress={onSwitchRole}>
            <Text style={styles.smallButtonText}>Switch</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, styles.danger]} onPress={onLogoutPress}>
            <Text style={styles.smallButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {unlocking ? <ActivityIndicator color={colors.primary} /> : null}

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Vishwas Score</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>{scoreValue ?? '--'}</Text>
          <Text style={styles.scoreMax}>/1000</Text>
        </View>
        <Text style={styles.scoreTier}>{getTierLabel(scoreValue)}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${scorePercent}%` }]} />
        </View>
        <Text style={styles.scoreHint}>Improve your score by linking verified platforms.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identity Snapshot</Text>
        <Text style={styles.meta}>Username: {profile?.username || 'n/a'}</Text>
        <Text style={styles.meta}>DID: {summary.did}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => (navigation as any).navigate('Activity')}>
          <Text style={styles.secondaryButtonText}>View activity</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Wallet Snapshot</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
        <Text style={styles.metric}>Credentials: {summary.credentialCount}</Text>
        <Text style={styles.metric}>Trust Score: {String(summary.trust)}</Text>
        <Pressable style={styles.primaryButton} onPress={authenticateAndLoad}>
          <Text style={styles.primaryButtonText}>Refresh wallet</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => (navigation as any).navigate('Settings')}>
          <Text style={styles.secondaryButtonText}>Privacy settings</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reputation Rail</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metric}>Portable Score</Text>
          <Text style={styles.metricValue}>{scoreValue ?? 'n/a'}/1000</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metric}>Events</Text>
          <Text style={styles.metricValue}>{String(reputation?.event_count ?? 0)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metric}>SafeDate</Text>
          <Text style={styles.metricValue}>{safeDateValue ?? 'n/a'}/100</Text>
        </View>
        <Text style={styles.meta}>
          Reason Codes: {Array.isArray(safeDate?.reason_codes) && safeDate.reason_codes.length ? safeDate.reason_codes.join(', ') : 'none'}
        </Text>
        <Pressable style={styles.primaryButton} onPress={onOpenZkProof}>
          <Text style={styles.primaryButtonText}>Generate ZK proof</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => (navigation as any).navigate('Connections')}>
          <Text style={styles.secondaryButtonText}>Manage connections</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Claim credential offer</Text>
        <Text style={styles.meta}>Paste an Issuer offer URL (or deep link URL parameter) to import a VC into your wallet.</Text>
        <TextInput
          style={styles.input}
          value={offerUrl}
          onChangeText={setOfferUrl}
          placeholder="https://issuer.../api/v1/public/issuance/offer/consume?token=..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.primaryButton} onPress={onClaimOffer} disabled={claimBusy}>
          <Text style={styles.primaryButtonText}>{claimBusy ? 'Claiming…' : 'Claim & store'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Credentials</Text>
        {!credentials.length ? <Text style={styles.meta}>No credentials available.</Text> : null}
        {credentials.slice(0, 5).map((cred) => (
          <Pressable key={String(cred.id)} style={styles.rowItem} onPress={() => onSelectCredential(cred.id)}>
            <Text style={styles.rowTitle}>#{cred.id}</Text>
            <Text style={styles.meta}>{cred.type || cred.templateId || 'Credential'}</Text>
          </Pressable>
        ))}

        <Pressable style={styles.primaryButton} onPress={onGenerateShare}>
          <Text style={styles.primaryButtonText}>Generate share QR</Text>
        </Pressable>
        {lastShareLink ? <Text style={styles.meta}>Last Share: {lastShareLink}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Compliance Controls</Text>
        <Text style={styles.metric}>Active Consents: {consents.length}</Text>
        <Text style={styles.metric}>Data Requests: {dataRequests.length}</Text>
        <Text style={styles.metric}>CERT-In Incidents: {certInIncidents.length}</Text>
        <Text style={styles.meta}>
          Latest Request: {dataRequests[0]?.request_type || 'none'} / {dataRequests[0]?.status || 'n/a'}
        </Text>
        <Pressable style={styles.primaryButton} onPress={onRequestExport}>
          <Text style={styles.primaryButtonText}>Request data export</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onRequestDelete}>
          <Text style={styles.secondaryButtonText}>Request data deletion</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onRevokeFirstConsent}>
          <Text style={styles.secondaryButtonText}>Revoke latest consent</Text>
        </Pressable>
      </View>

      {selectedCredential ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Credential Detail</Text>
          <Text style={styles.meta}>ID: {selectedCredential?.credential?.id || selectedCredential?.id || 'n/a'}</Text>
          <Text style={styles.meta}>Type: {selectedCredential?.credential?.type || selectedCredential?.credential?.templateId || selectedCredential?.credential?.data?.vc?.type?.[1] || 'n/a'}</Text>
          <Text style={styles.meta}>Issuer: {selectedCredential?.credential?.issuer || selectedCredential?.credential?.issuerDid || 'n/a'}</Text>
          <Text style={styles.meta}>Status: {selectedCredential?.credential?.status || (selectedCredential?.credential?.revoked ? 'revoked' : 'active')}</Text>
          <Text style={styles.meta}>
            Anchor: {selectedCredential?.credential?.anchorStatus || selectedCredential?.credential?.data?.proof?.code || 'unknown'}
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => onOpenDisclosure(selectedCredential?.credential?.id || selectedCredential?.id)}
          >
            <Text style={styles.primaryButtonText}>Selective disclose (recruiter package)</Text>
          </Pressable>
        </View>
      ) : null}
      </ScrollView>

      <Modal
        transparent
        visible={showDisclosure}
        animationType="slide"
        onRequestClose={() => {
          setShowDisclosure(false);
          setSharePayload(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selective disclosure</Text>
            <Text style={styles.modalSubtitle}>Choose which fields to disclose. We generate a deterministic proof hash for auditability.</Text>

            {!availableFields.length ? (
              <Text style={styles.modalHint}>No fields detected for this credential.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {availableFields.map((field) => {
                  const selected = selectedFields.has(field);
                  return (
                    <Pressable
                      key={field}
                      style={[styles.disclosureRow, selected ? styles.disclosureRowSelected : null]}
                      onPress={() => {
                        setSelectedFields((prev) => {
                          const next = new Set(prev);
                          if (next.has(field)) next.delete(field);
                          else next.add(field);
                          return next;
                        });
                      }}
                    >
                      <Text style={styles.disclosureRowText}>{selected ? '✓ ' : ''}{field}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setShowDisclosure(false)}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={onGenerateRecruiterPackage}>
                <Text style={styles.primaryButtonText}>Generate package</Text>
              </Pressable>
            </View>

            {sharePayload ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.modalLabel}>Recruiter payload</Text>
                <TextInput style={[styles.input, { minHeight: 140 }]} multiline value={sharePayload} editable={false} />
                <Text style={styles.modalHint}>
                  Recruiter: paste this JSON into Recruiter → Instant Verification (it auto-detects JSON vs JWT).
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showZkProof} animationType="slide" onRequestClose={onCloseZkProof}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selective disclosure</Text>
            <Text style={styles.modalSubtitle}>
              Prove a claim without revealing private data. The verifier only learns the claim is true.
            </Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Claim</Text>
              <Text style={styles.modalValue}>WorkScore is above required threshold</Text>
              <Text style={styles.modalMeta}>Your exact score stays private.</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>What will be shared</Text>
              <Text style={styles.modalMeta}>• Proof of claim validity</Text>
              <Text style={styles.modalMeta}>• Proof timestamp</Text>
              <Text style={styles.modalMeta}>• No raw score or identity data</Text>
            </View>

            <Text style={styles.modalHint}>
              You can revoke access anytime from your activity log or privacy settings.
            </Text>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={onCloseZkProof}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowZkProof(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Confirm proof</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12, alignItems: 'flex-start' as const },
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
    scoreCard: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      padding: 18,
      gap: 8,
      shadowColor: colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
    },
    scoreLabel: { color: '#E0E7FF', fontWeight: '700' as const, fontFamily: 'Inter_700Bold', letterSpacing: 0.4 },
    scoreRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 6 },
    scoreValue: { color: 'white', fontSize: 36, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    scoreMax: { color: '#BFDBFE', fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 6 },
    scoreTier: { color: '#DBEAFE', fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.25)',
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: 8,
      borderRadius: 999,
      backgroundColor: '#FCD34D',
    },
    scoreHint: { color: '#E0E7FF', fontSize: 12, fontFamily: 'Inter_400Regular' },
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
    cardHeaderRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    cardTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 16 },
    meta: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    metric: { color: colors.text, fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
    metricRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
    metricValue: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
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
      backgroundColor: 'transparent',
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
    modalSection: { gap: 4 },
    modalLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    modalValue: { color: colors.text, fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    modalMeta: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular' },
    modalHint: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular' },
    modalActions: { flexDirection: 'row' as const, gap: 12, justifyContent: 'space-between' as const },
    smallButton: {
      backgroundColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    danger: { backgroundColor: colors.danger },
    smallButtonText: { color: 'white', fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    rowItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowTitle: { color: colors.text, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
    disclosureRow: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
    },
    disclosureRowSelected: {
      borderColor: colors.primary,
    },
    disclosureRowText: { color: colors.text, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
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
  });
}
