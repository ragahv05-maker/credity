import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { getHolderActivity } from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  status: 'verified' | 'pending' | 'revoked';
  timestamp: string;
}

function statusPillBg(status: 'verified' | 'pending' | 'revoked', colors: ColorPalette): string {
  if (status === 'verified') return colors.successSurface;
  if (status === 'pending') return colors.warningSurface;
  return colors.dangerSurface;
}

export function ActivityScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const canGoBack = navigation.canGoBack();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['holder', 'activity'],
    queryFn: getHolderActivity,
  });

  const items: ActivityItem[] = data ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Activity</Text>
            <Text style={styles.title}>Audit timeline</Text>
            <Text style={styles.subtitle}>Every share and verification is logged here.</Text>
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
          <Text style={styles.cardTitle}>Recent activity</Text>

          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptySubtitle}>Loading activity...</Text>
            </View>
          ) : isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Could not load activity</Text>
              <Pressable onPress={() => void refetch()}>
                <Text style={[styles.emptySubtitle, { color: colors.primary, marginTop: 4 }]}>Retry</Text>
              </Pressable>
            </View>
          ) : !items.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtitle}>
                When you share credentials or connect platforms, they will appear here.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineIndicator}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineSubtitle}>{item.description}</Text>
                  <View style={styles.timelineMetaRow}>
                    <View style={[styles.statusPill, { backgroundColor: statusPillBg(item.status, colors) }]}>
                      <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.timelineTime}>{item.timestamp}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
      gap: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    cardTitle: { color: colors.text, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', fontSize: 16 },
    emptyState: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 6,
      backgroundColor: colors.input,
    },
    emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    emptySubtitle: { color: colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular' },
    timelineRow: { flexDirection: 'row' as const, gap: 12, paddingVertical: 8 },
    timelineIndicator: { alignItems: 'center' as const, width: 12 },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginTop: 4,
    },
    timelineContent: { flex: 1, gap: 4 },
    timelineTitle: { color: colors.text, fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    timelineSubtitle: { color: colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular' },
    timelineMetaRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: { color: colors.text, fontSize: 10, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
    timelineTime: { color: colors.muted, fontSize: 11, fontFamily: 'Inter_400Regular' },
  });
}
