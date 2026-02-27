import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { getHolderCredentials, revokeCredential } from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

type CredentialStatus = 'Active' | 'Expired' | 'Pending';

interface CredentialItem {
  id: string;
  typeBadges: string[];
  issuerName: string;
  issuedAt: string | null;
  expiresAt: string | null;
  status: CredentialStatus;
  jwt: string | null;
  raw: Record<string, unknown>;
}

function formatDate(value: string | null): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString();
}

function normalizeStatus(statusValue: unknown, expiresAt: string | null): CredentialStatus {
  if (typeof statusValue === 'string') {
    const normalized = statusValue.toLowerCase();
    if (normalized.includes('pending')) return 'Pending';
    if (normalized.includes('expired') || normalized.includes('revoked')) return 'Expired';
    if (normalized.includes('active') || normalized.includes('valid')) return 'Active';
  }
  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
      return 'Expired';
    }
  }
  return 'Active';
}

function toCredentialItem(payload: unknown): CredentialItem {
  const source = (payload || {}) as Record<string, unknown>;

  const idValue = source.id || source.credentialId || source.credential_id || source.vcId || source.jwtId;
  const issuedAt =
    (source.issuedAt as string | undefined) ||
    (source.issuanceDate as string | undefined) ||
    (source.issued_at as string | undefined) ||
    null;
  const expiresAt =
    (source.expiresAt as string | undefined) ||
    (source.expiry as string | undefined) ||
    (source.expiryDate as string | undefined) ||
    (source.expires_at as string | undefined) ||
    null;

  const typeSource = source.type || source.types || source.credentialType;
  const typeBadges = Array.isArray(typeSource)
    ? typeSource
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .slice(0, 3)
    : typeof typeSource === 'string' && typeSource.trim().length > 0
      ? [typeSource]
      : ['Verified Credential'];

  const jwt =
    (source.jwt as string | undefined) ||
    (source.vcJwt as string | undefined) ||
    (source.credentialJwt as string | undefined) ||
    (source.token as string | undefined) ||
    null;

  return {
    id: String(idValue || Math.random().toString(16).slice(2)),
    typeBadges,
    issuerName: String(source.issuerName || source.issuer || source.issuedBy || 'CredVerse Issuer'),
    issuedAt,
    expiresAt,
    status: normalizeStatus(source.status, expiresAt),
    jwt,
    raw: source,
  };
}

function statusColor(status: CredentialStatus, colors: ColorPalette): { bg: string; text: string } {
  if (status === 'Active') return { bg: colors.successSurface, text: colors.successOnSurface };
  if (status === 'Pending') return { bg: colors.warningSurface, text: colors.warningOnSurface };
  return { bg: colors.dangerSurface, text: colors.dangerOnSurface };
}

export function CredentialsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['holder', 'credentials'],
    queryFn: getHolderCredentials,
  });

  const queryClient = useQueryClient();
  const revokeMutation = useMutation({
    mutationFn: (credentialId: string) => revokeCredential(credentialId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['holder', 'credentials'] });
      sheetRef.current?.close();
    },
    onError: () => {
      Alert.alert('Error', 'Could not revoke credential. Please try again.');
    },
  });

  const credentials = useMemo(() => {
    const source = Array.isArray(data) ? data : [];
    return source.map(toCredentialItem);
  }, [data]);

  const activeCount = useMemo(
    () => credentials.filter((c) => c.status === 'Active').length,
    [credentials],
  );

  const [selected, setSelected] = useState<CredentialItem | null>(null);
  const [showQr, setShowQr] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%', '88%'], []);
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    [],
  );

  function openDetail(credential: CredentialItem) {
    setSelected(credential);
    setShowQr(false);
    requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(0);
    });
  }

  const closeDetail = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setSelected(null);
      setShowQr(false);
    }
  }, []);

  const detailCard = useMemo(() => {
    if (!selected) {
      return <Text style={styles.sheetValue}>Select a credential to view details.</Text>;
    }

    return (
      <>
        <Text style={styles.sheetLabel}>Issuer</Text>
        <Text style={styles.sheetValue}>{selected.issuerName}</Text>

        <Text style={styles.sheetLabel}>Types</Text>
        <Text style={styles.sheetValue}>{selected.typeBadges.join(', ')}</Text>

        <Text style={styles.sheetLabel}>Issued</Text>
        <Text style={styles.sheetValue}>{formatDate(selected.issuedAt)}</Text>

        <Text style={styles.sheetLabel}>Expiry</Text>
        <Text style={styles.sheetValue}>{formatDate(selected.expiresAt)}</Text>

        <View style={styles.sheetActions}>
          <Pressable style={styles.secondaryButton} onPress={shareViaQr}>
            <Text style={styles.secondaryButtonText}>Share via QR</Text>
          </Pressable>
          <Pressable
            style={[styles.dangerButton, revokeMutation.isPending && { opacity: 0.6 }]}
            disabled={revokeMutation.isPending}
            onPress={() => {
              if (!selected) return;
              Alert.alert(
                'Revoke credential',
                'This will revoke the credential and cannot be undone. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: () => revokeMutation.mutate(selected.id),
                  },
                ],
              );
            }}
          >
            <Text style={styles.dangerButtonText}>
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
            </Text>
          </Pressable>
        </View>

        {showQr && selected.jwt ? (
          <View style={styles.qrWrap}>
            <QRCode value={selected.jwt} size={180} />
            <Text style={styles.qrCaption}>Scan to share credential JWT</Text>
          </View>
        ) : null}
      </>
    );
  }, [selected, showQr, styles, revokeMutation]);

  const activeCountLabel = useMemo(() => {
    return `${activeCount} active`;
  }, [activeCount]);

  const isSheetVisible = selected !== null;

  const closeButton = useMemo(
    () => (
      <Pressable style={styles.closeButton} onPress={closeDetail}>
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
    ),
    [closeDetail, styles],
  );

  const sheetContent = useMemo(
    () => (
      <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
        <Text style={styles.sheetTitle}>Credential Details</Text>
        {detailCard}
        {closeButton}
      </BottomSheetScrollView>
    ),
    [closeButton, detailCard, styles],
  );

  const sheet = useMemo(
    () => (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onChange={handleSheetChange}
      >
        {sheetContent}
      </BottomSheet>
    ),
    [handleSheetChange, renderBackdrop, sheetContent, snapPoints],
  );

  const countBadgeText = useMemo(() => {
    return activeCountLabel;
  }, [activeCountLabel]);

  function shareViaQr() {
    if (!selected?.jwt) {
      Alert.alert('Unavailable', 'This credential does not include a shareable JWT yet.');
      return;
    }
    setShowQr(true);
  }

  const renderItem: ListRenderItem<CredentialItem> = useCallback(
    ({ item }) => {
      const sc = statusColor(item.status, colors);
      return (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <Pressable style={styles.card} onPress={() => openDetail(item)}>
            <View style={styles.badgeRow}>
              {item.typeBadges.map((badge) => (
                <View key={`${item.id}-${badge}`} style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{badge}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardMetaRow}>
              <Text style={styles.issuerText}>{item.issuerName}</Text>
              <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusChipText, { color: sc.text }]}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.dateText}>Issued: {formatDate(item.issuedAt)}</Text>
            <Text style={styles.dateText}>Expiry: {formatDate(item.expiresAt)}</Text>
          </Pressable>
        </LinearGradient>
      );
    },
    [colors, styles, openDetail],
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Credential Wallet</Text>
          <Text style={styles.title}>My Credentials</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{countBadgeText}</Text>
        </View>
      </View>
    ),
    [styles, countBadgeText],
  );

  const ListEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Loading credentials...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.placeholderCard}>
          <Text style={styles.errorText}>Could not load credentials.</Text>
          <Pressable style={styles.retryButton} onPress={() => void refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.placeholderCard}>
        <Text style={styles.emptyTitle}>No credentials yet.</Text>
        <Text style={styles.emptyText}>
          Complete identity verification to get your first credential.
        </Text>
      </View>
    );
  }, [isLoading, isError, refetch, styles]);

  const keyExtractor = useCallback((item: CredentialItem) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={credentials}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      {isSheetVisible ? sheet : null}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    kicker: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    title: { color: colors.text, fontSize: 26, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    countBadge: {
      backgroundColor: colors.successSurface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    countBadgeText: { color: colors.successOnSurface, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 12 },
    gradientBorder: { borderRadius: 16, padding: 1.4 },
    card: {
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    badgeRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    typeBadge: {
      borderRadius: 999,
      backgroundColor: colors.badgeSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.badgeBorder,
    },
    typeBadgeText: { color: colors.badgeText, fontSize: 11, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    cardMetaRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    issuerText: { color: colors.text, fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', flexShrink: 1 },
    statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    statusChipText: { fontSize: 11, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    dateText: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular' },
    placeholderCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      gap: 8,
    },
    placeholderText: { color: colors.muted, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
    errorText: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    retryButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignSelf: 'flex-start' as const,
    },
    retryButtonText: { color: colors.primary, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    emptyText: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    sheetContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
    sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold', marginBottom: 6 },
    sheetLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700' as const,
      fontFamily: 'Inter_700Bold',
      textTransform: 'uppercase' as const,
    },
    sheetValue: { color: colors.text, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
    sheetActions: { flexDirection: 'row' as const, gap: 10, marginTop: 10 },
    secondaryButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: 'center' as const,
      backgroundColor: colors.input,
    },
    secondaryButtonText: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    dangerButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center' as const,
      backgroundColor: colors.dangerSurface,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerButtonText: { color: colors.dangerOnSurface, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    qrWrap: {
      marginTop: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      alignItems: 'center' as const,
      gap: 10,
    },
    qrCaption: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular' },
    closeButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
      paddingVertical: 10,
      backgroundColor: colors.input,
      marginTop: 8,
    },
    closeButtonText: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  });
}
