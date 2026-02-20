import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import {
  completeLivenessSession,
  startLivenessSession,
  submitLivenessChallenge,
} from '../lib/api-client';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface LivenessChallenge {
  id: string;
  instruction: string;
}

interface LivenessResultState {
  success: boolean;
  score: number;
  message?: string;
}

const FALLBACK_CHALLENGES: LivenessChallenge[] = [
  { id: 'fallback-1', instruction: 'Blink your eyes twice' },
  { id: 'fallback-2', instruction: 'Turn your head left and right' },
  { id: 'fallback-3', instruction: 'Smile at the camera' },
];

function normalizeChallenges(payload: unknown): LivenessChallenge[] {
  const source = Array.isArray(payload) ? payload : [];
  const normalized = source
    .map((item, index) => {
      const challenge = (item || {}) as Record<string, unknown>;
      const instruction =
        (challenge.instruction as string | undefined) ||
        (challenge.label as string | undefined) ||
        FALLBACK_CHALLENGES[index % FALLBACK_CHALLENGES.length].instruction;
      const id =
        (challenge.id as string | undefined) ||
        (challenge.challengeId as string | undefined) ||
        `challenge-${index + 1}`;
      return { id, instruction };
    })
    .slice(0, 3);

  while (normalized.length < 3) {
    normalized.push(FALLBACK_CHALLENGES[normalized.length]);
  }
  return normalized;
}

function normalizeCompletionResult(payload: any): LivenessResultState {
  const scoreSource =
    payload?.score ??
    payload?.result?.score ??
    payload?.result?.confidence ??
    payload?.result?.trustScore ??
    0;
  const score = Number.isFinite(Number(scoreSource)) ? Number(scoreSource) : 0;
  const success = Boolean(payload?.passed ?? payload?.verified ?? payload?.success);
  return {
    success,
    score: Math.max(0, Math.min(100, Math.round(score))),
    message: payload?.message || payload?.error,
  };
}

export function LivenessScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'booting' | 'capturing' | 'submitting' | 'result'>('booting');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<LivenessChallenge[]>(FALLBACK_CHALLENGES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(5);
  const [result, setResult] = useState<LivenessResultState | null>(null);

  const countdownValue = useRef(new Animated.Value(1)).current;
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeChallenge = challenges[activeIndex] || FALLBACK_CHALLENGES[activeIndex] || FALLBACK_CHALLENGES[0];

  const countdownBarWidth = useMemo(
    () =>
      countdownValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [countdownValue],
  );

  const stopCountdown = useCallback(() => {
    countdownValue.stopAnimation();
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, [countdownValue]);

  const startCountdown = useCallback(() => {
    stopCountdown();
    setRemainingSeconds(5);
    countdownValue.setValue(1);
    Animated.timing(countdownValue, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    countdownTimer.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [countdownValue, stopCountdown]);

  const bootstrapSession = useCallback(async () => {
    setPhase('booting');
    setResult(null);
    setActiveIndex(0);
    stopCountdown();

    try {
      const started = await startLivenessSession();
      const nextChallenges = normalizeChallenges(started?.challenges || []);
      setSessionId(started?.sessionId || null);
      setChallenges(nextChallenges);
      setPhase('capturing');
      startCountdown();
    } catch (error) {
      setResult({
        success: false,
        score: 0,
        message: error instanceof Error ? error.message : 'Unable to start liveness session.',
      });
      setPhase('result');
    }
  }, [startCountdown, stopCountdown]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      void requestPermission();
      return;
    }
    void bootstrapSession();
  }, [bootstrapSession, permission, requestPermission]);

  useEffect(() => {
    return () => {
      stopCountdown();
    };
  }, [stopCountdown]);

  async function onCompleteChallenge() {
    if (!sessionId || !activeChallenge || phase !== 'capturing') {
      return;
    }

    try {
      setPhase('submitting');
      stopCountdown();
      const challengeResponse = await submitLivenessChallenge({
        sessionId,
        challengeId: activeChallenge.id,
        completed: true,
      });

      const nextIndex = activeIndex + 1;
      if (challengeResponse?.sessionComplete || nextIndex >= 3) {
        const completion = await completeLivenessSession(sessionId);
        setResult(normalizeCompletionResult(completion));
        setPhase('result');
        return;
      }

      setActiveIndex(nextIndex);
      setPhase('capturing');
      startCountdown();
    } catch (error) {
      setResult({
        success: false,
        score: 0,
        message: error instanceof Error ? error.message : 'Unable to submit liveness challenge.',
      });
      setPhase('result');
    }
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera permission required</Text>
        <Text style={styles.permissionText}>Enable camera access to complete liveness verification.</Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'result' && result) {
    return (
      <View style={styles.resultContainer}>
        <Text style={[styles.resultIcon, { color: result.success ? colors.success : colors.danger }]}>
          {result.success ? '✓' : '✕'}
        </Text>
        <Text style={styles.resultTitle}>{result.success ? 'Verification Complete' : 'Verification Failed'}</Text>
        <Text style={styles.resultSubtitle}>
          {result.success ? `Liveness score: ${result.score}` : result.message || 'Please try again.'}
        </Text>

        {result.success ? (
          <Pressable style={styles.primaryButton} onPress={() => (navigation as any).goBack()}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={() => void bootstrapSession()}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing={'front' as CameraType} />

      <View style={styles.overlayCenter}>
        <Svg width={260} height={260}>
          <Circle cx={130} cy={130} r={105} stroke="#FFFFFF" strokeWidth={4} fill="transparent" />
          <Circle cx={130} cy={130} r={95} stroke="rgba(255,255,255,0.4)" strokeWidth={2} fill="transparent" />
        </Svg>
      </View>

      <View style={styles.challengeCard}>
        <Text style={styles.challengeLabel}>Current Challenge</Text>
        <Text style={styles.challengeText}>{activeChallenge.instruction}</Text>

        <View style={styles.dotRow}>
          {[0, 1, 2].map((dot) => (
            <View key={dot} style={[styles.dot, dot === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.timerWrap}>
          <Animated.View style={[styles.timerFill, { width: countdownBarWidth }]} />
        </View>
        <Text style={styles.timerText}>{remainingSeconds}s remaining</Text>

        <Pressable
          style={[styles.primaryButton, phase === 'submitting' && styles.disabledButton]}
          onPress={() => void onCompleteChallenge()}
          disabled={phase === 'submitting'}
        >
          <Text style={styles.primaryButtonText}>{phase === 'submitting' ? 'Submitting...' : 'Done'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    permissionContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 24,
      justifyContent: 'center' as const,
      gap: 10,
    },
    permissionTitle: { color: colors.text, fontSize: 24, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    permissionText: { color: colors.muted, fontSize: 14, fontFamily: 'Inter_400Regular' },
    overlayCenter: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    challengeCard: {
      position: 'absolute' as const,
      left: 16,
      right: 16,
      bottom: 20,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      backgroundColor: 'rgba(15, 23, 42, 0.82)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    challengeLabel: {
      color: '#CBD5E1',
      fontSize: 12,
      fontWeight: '700' as const,
      fontFamily: 'Inter_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    challengeText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    dotRow: { flexDirection: 'row' as const, gap: 8 },
    dot: {
      height: 8,
      width: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
    dotActive: { backgroundColor: '#FFFFFF' },
    timerWrap: {
      height: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.2)',
      overflow: 'hidden' as const,
    },
    timerFill: {
      height: '100%' as any,
      backgroundColor: '#34D399',
    },
    timerText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
    primaryButton: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    disabledButton: { opacity: 0.6 },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold' },
    resultContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 24,
      gap: 10,
    },
    resultIcon: { fontSize: 88, lineHeight: 92, fontWeight: '800' as const },
    resultTitle: { color: colors.text, fontSize: 28, fontWeight: '800' as const, fontFamily: 'Inter_800ExtraBold', textAlign: 'center' as const },
    resultSubtitle: { color: colors.muted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' as const, marginBottom: 8 },
  });
}
