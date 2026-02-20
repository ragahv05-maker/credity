import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import {
  approveConnection,
  denyConnection,
  disconnectConnection,
  getHolderConnections,
  getPendingConnections,
} from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface ConnectionItem {
  id: string;
  platformName: string;
  connectedAt: string | null;
}

interface PendingRequestItem {
  id: string;
  platformName: string;
  requestedCredentials: string[];
}

const COMING_SOON_PLATFORMS = ['Uber', 'LinkedIn', 'Swiggy', 'Tinder'];

function formatDate(value: string | null): string {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString();
}

function toConnectionItem(payload: unknown): ConnectionItem {
  const source = (payload || {}) as Record<string, unknown>;
  return {
    id: String(source.id || source.connectionId || Math.random().toString(16).slice(2)),
    platformName: String(source.platformName || source.platform || source.name || 'Unknown Platform'),
    connectedAt:
      (source.connectedAt as string | undefined) ||
      (source.createdAt as string | undefined) ||
      (source.connected_since as string | undefined) ||
      null,
  };
}

function toPendingRequestItem(payload: unknown): PendingRequestItem {
  const source = (payload || {}) as Record<string, unknown>;
  return {
    id: String(source.id || source.requestId || Math.random().toString(16).slice(2)),
    platformName: String(source.platformName || source.platform || source.name || 'Unknown Platform'),
    requestedCredentials: Array.isArray(source.requestedCredentials)
      ? source.requestedCredentials
          .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [],
  };
}

export function ConnectionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const queryClient = useQueryClient();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const connectionsQuery = useQuery({
    queryKey: ['holder', 'connections'],
    queryFn: getHolderConnections,
  });
  const pendingQuery = useQuery({
    queryKey: ['holder', 'connections', 'pending'],
    queryFn: getPendingConnections,
  });

  const connections = useMemo(() => {
    const source = Array.isArray(connectionsQuery.data) ? connectionsQuery.data : [];
    return source.map(toConnectionItem);
  }, [connectionsQuery.data]);

  const pendingRequests = useMemo(() => {
    const source = Array.isArray(pendingQuery.data) ? pendingQuery.data : [];
    return source.map(toPendingRequestItem);
  }, [pendingQuery.data]);

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectConnection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['holder', 'connections'] });
    },
    onError: (error: any) => {
      Alert.alert('Disconnect failed', error?.message || 'Unable to disconnect this platform.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveConnection(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['holder', 'connections'] }),
        queryClient.invalidateQueries({ queryKey: ['holder', 'connections', 'pending'] }),
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Approve failed', error?.message || 'Unable to approve this request.');
    },
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => denyConnection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['holder', 'connections', 'pending'] });
    },
    onError: (error: any) => {
      Alert.alert('Deny failed', error?.message || 'Unable to deny this request.');
    },
  });

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([connectionsQuery.refetch(), pendingQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  function renderDisconnectAction(connectionId: string) {
    return (
      <Pressable
        style={styles.swipeAction}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          disconnectMutation.mutate(connectionId);
        }}
      >
        <Text style={styles.swipeActionText}>Disconnect</Text>
      </Pressable>
    );
  }

  const loading = connectionsQuery.isLoading || pendingQuery.isLoading;
  const hasError = connectionsQuery.isError || pendingQuery.isError;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Connections</Text>
          <Text style={styles.title}>Platform access controls</Text>
          <Text style={styles.subtitle}>Approve requests and revoke active integrations anytime.</Text>
        </View>

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.meta}>Loading connections...</Text>
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.card}>
            <Text style={styles.meta}>Could not load connections. Pull to refresh.</Text>
          </View>
        ) : null}

        {!loading ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Connections</Text>
            {connections.length === 0 ? (
              <Text style={styles.meta}>No active platform connections.</Text>
            ) : (
              connections.map((connection) => (
                <Swipeable
                  key={connection.id}
                  overshootRight={false}
                  renderRightActions={() => renderDisconnectAction(connection.id)}
                >
                  <View style={styles.row}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {connection.platformName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>{connection.platformName}</Text>
                      <Text style={styles.rowMeta}>Connected since {formatDate(connection.connectedAt)}</Text>
                    </View>

                    <Pressable
                      style={styles.disconnectButton}
                      onPress={() => disconnectMutation.mutate(connection.id)}
                    >
                      <Text style={styles.disconnectButtonText}>Disconnect</Text>
                    </Pressable>
                  </View>
                </Swipeable>
              ))
            )}
          </View>
        ) : null}

        {!loading && pendingRequests.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pending Requests</Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.pendingRow}>
                <Text style={styles.rowTitle}>{request.platformName}</Text>
                <Text style={styles.rowMeta}>
                  Asking for:{' '}
                  {request.requestedCredentials.length
                    ? request.requestedCredentials.join(', ')
                    : 'credential access'}
                </Text>
                <View style={styles.pendingActions}>
                  <Pressable style={styles.approveButton} onPress={() => approveMutation.mutate(request.id)}>
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable style={styles.denyButton} onPress={() => denyMutation.mutate(request.id)}>
                    <Text style={styles.denyButtonText}>Deny</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowConnectModal(true);
        }}
      >
        <Text style={styles.fabText}>Connect a Platform</Text>
      </Pressable>

      <Modal
        transparent
        visible={showConnectModal}
        animationType="slide"
        onRequestClose={() => setShowConnectModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Available Platforms</Text>
            <View style={styles.platformGrid}>
              {COMING_SOON_PLATFORMS.map((platform) => (
                <View key={platform} style={styles.platformTile}>
                  <Text style={styles.platformTileTitle}>{platform}</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable style={styles.closeButton} onPress={() => setShowConnectModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12, paddingBottom: 110 },
    header: { gap: 4 },
    kicker: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700' as const,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    title: { color: colors.text, fontSize: 26, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    subtitle: { color: colors.muted, fontFamily: 'Inter_400Regular' },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    cardTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 16 },
    meta: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      padding: 10,
    },
    avatar: {
      height: 34,
      width: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    avatarText: { color: colors.text, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    rowContent: { flex: 1, gap: 2 },
    rowTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 14 },
    rowMeta: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular' },
    disconnectButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSurface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    disconnectButtonText: { color: colors.dangerOnSurface, fontSize: 12, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    swipeAction: {
      marginVertical: 2,
      borderRadius: 12,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 14,
      backgroundColor: colors.danger,
    },
    swipeActionText: { color: '#FFFFFF', fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    pendingRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      padding: 10,
      gap: 8,
    },
    pendingActions: { flexDirection: 'row' as const, gap: 8 },
    approveButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.successSurface,
      borderWidth: 1,
      borderColor: colors.success,
      alignItems: 'center' as const,
      paddingVertical: 8,
    },
    approveButtonText: { color: colors.successOnSurface, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
    denyButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.dangerSurface,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: 'center' as const,
      paddingVertical: 8,
    },
    denyButtonText: { color: colors.dangerOnSurface, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
    fab: {
      position: 'absolute' as const,
      right: 16,
      bottom: 20,
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: colors.primary,
      shadowOpacity: 0.32,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    fabText: { color: '#FFFFFF', fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end' as const,
      backgroundColor: colors.overlay,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      gap: 14,
    },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    platformGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 },
    platformTile: {
      width: '48%' as any,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      padding: 12,
      gap: 8,
      opacity: 0.8,
    },
    platformTileTitle: { color: colors.muted, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    comingSoonBadge: {
      alignSelf: 'flex-start' as const,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    comingSoonText: { color: colors.muted, fontSize: 11, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    closeButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
      paddingVertical: 10,
      backgroundColor: colors.input,
    },
    closeButtonText: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  });
}
