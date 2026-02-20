import React, { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getHolderReputationScore, getHolderTrustSuggestions } from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRing = Animated.createAnimatedComponent(View);

const RING_SIZE = 180;
const STROKE_WIDTH = 14;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreBreakdownItem {
  label: 'Identity' | 'Activity' | 'Reputation';
  points: number;
  max: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readNumericValue(record: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const maybeValue = record[key];
    if (typeof maybeValue === 'number' && Number.isFinite(maybeValue)) {
      return maybeValue;
    }
  }
  return null;
}

function normalizeScore(payload: unknown): number {
  const source = (payload || {}) as Record<string, unknown>;
  const raw = readNumericValue(source, ['score', 'trustScore', 'overall', 'overallScore', 'value']) ?? 0;

  if (raw > 100 && raw <= 1000) {
    return clampPercent(raw / 10);
  }
  return clampPercent(raw);
}

function toPoints(value: number | null, max: number, fallbackScore: number): number {
  if (value === null) {
    return Math.round((fallbackScore / 100) * max);
  }

  const normalized = value > max ? (value > 100 ? value / 10 : value / 100) * max : value;
  return Math.max(0, Math.min(max, Math.round(normalized)));
}

function scoreStatusLabel(score: number): string {
  if (score >= 95) return 'Outstanding ⭐';
  if (score >= 85) return 'Excellent ✦';
  if (score >= 70) return 'Good ✓';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function scoreColor(score: number, colors: ColorPalette): string {
  if (score >= 70) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function scoreBreakdown(payload: unknown, score: number): ScoreBreakdownItem[] {
  const source = (payload || {}) as Record<string, unknown>;
  const nested = (source.breakdown || source.components || {}) as Record<string, unknown>;
  const merged = { ...source, ...nested };

  return [
    {
      label: 'Identity',
      max: 35,
      points: toPoints(readNumericValue(merged, ['identity', 'identityScore', 'identity_points']), 35, score),
    },
    {
      label: 'Activity',
      max: 35,
      points: toPoints(readNumericValue(merged, ['activity', 'activityScore', 'activity_points']), 35, score),
    },
    {
      label: 'Reputation',
      max: 30,
      points: toPoints(readNumericValue(merged, ['reputation', 'reputationScore', 'reputation_points']), 30, score),
    },
  ];
}

function LoadingRingPlaceholder() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1200, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const ringStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.ringContainer}>
      <AnimatedRing style={ringStyle}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.surfaceMuted}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.2} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            fill="transparent"
          />
        </Svg>
      </AnimatedRing>
      <Text style={styles.loadingText}>Loading score...</Text>
    </View>
  );
}

function ProgressRing({ score }: { score: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(score, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, score]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE * progress.value) / 100,
    };
  });

  const ringStrokeColor = scoreColor(score, colors);

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={colors.surfaceMuted}
          strokeWidth={STROKE_WIDTH}
          fill="transparent"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={ringStrokeColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          fill="transparent"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.scoreNumber}>{score}</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
    </View>
  );
}

export function TrustScoreScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    data: scorePayload,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['holder', 'reputation-score'],
    queryFn: getHolderReputationScore,
  });

  const {
    data: suggestions,
    refetch: refetchSuggestions,
    isFetching: isFetchingSuggestions,
  } = useQuery({
    queryKey: ['holder', 'trust-suggestions'],
    queryFn: getHolderTrustSuggestions,
    enabled: false,
  });

  const score = useMemo(() => normalizeScore(scorePayload), [scorePayload]);
  const label = useMemo(() => scoreStatusLabel(score), [score]);
  const breakdown = useMemo(() => scoreBreakdown(scorePayload, score), [scorePayload, score]);
  const accentColor = scoreColor(score, colors);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Trust Score</Text>
          <Text style={styles.title}>Your reputation dashboard</Text>
          <Text style={styles.subtitle}>Monitor your trust profile and improve weak signals.</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? <LoadingRingPlaceholder /> : null}

          {!isLoading && isError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>Could not load score. Tap to retry.</Text>
              <Pressable style={styles.retryButton} onPress={() => void refetch()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <ProgressRing score={score} />
              <Text style={[styles.statusLabel, { color: accentColor }]}>{label}</Text>

              <View style={styles.breakdownWrap}>
                {breakdown.map((item) => {
                  const ratio = item.max > 0 ? item.points / item.max : 0;
                  return (
                    <View key={item.label} style={styles.breakdownRow}>
                      <View style={styles.breakdownHeader}>
                        <Text style={styles.breakdownLabel}>{item.label}</Text>
                        <Text style={styles.breakdownValue}>
                          {item.points}/{item.max}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.max(0, ratio * 100)}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            (navigation as any).navigate('Liveness');
          }}
        >
          <Text style={styles.secondaryButtonText}>Verify Identity</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, (isFetching || isFetchingSuggestions) && styles.primaryButtonDisabled]}
          disabled={isFetching || isFetchingSuggestions}
          onPress={async () => {
            const result = suggestions ?? (await refetchSuggestions()).data;
            const wins = result?.quickWins ?? [];
            if (wins.length > 0) {
              const lines = wins.slice(0, 4).map((s) => `• ${s.action} (+${s.points} pts)`).join('\n');
              Alert.alert('Quick wins', lines);
            } else {
              Alert.alert('Looking good!', 'No quick improvements found right now. Keep verifying credentials.');
            }
          }}
        >
          <Text style={styles.primaryButtonText}>
            {isFetchingSuggestions ? 'Loading...' : 'Improve Score'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 120 },
    header: { gap: 4 },
    kicker: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: { color: colors.text, fontSize: 26, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
    subtitle: { color: colors.muted, fontFamily: 'Inter_400Regular' },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: RING_SIZE,
      width: RING_SIZE,
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreNumber: { color: colors.text, fontSize: 42, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
    scoreLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
    statusLabel: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
    breakdownWrap: { width: '100%', gap: 10 },
    breakdownRow: { gap: 6 },
    breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownLabel: { color: colors.text, fontWeight: '700', fontFamily: 'Inter_700Bold' },
    breakdownValue: { color: colors.muted, fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
    progressTrack: {
      height: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    loadingText: { color: colors.muted, marginTop: 12, fontSize: 13, fontFamily: 'Inter_400Regular' },
    errorWrap: { width: '100%', alignItems: 'center', gap: 10, paddingVertical: 14 },
    errorText: { color: colors.text, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
    retryButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    retryButtonText: { color: colors.primary, fontWeight: '700', fontFamily: 'Inter_700Bold' },
    footer: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 20,
      gap: 10,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryButtonDisabled: { opacity: 0.65 },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.input,
    },
    secondaryButtonText: { color: colors.text, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  });
}
