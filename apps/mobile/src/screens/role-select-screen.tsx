import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppRole } from '../types';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/tokens';

interface Props {
  onSelectRole: (role: AppRole) => void;
}

export function RoleSelectScreen({ onSelectRole }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const ROLE_COPY = useMemo(
    () => ({
      holder: {
        title: 'Holder Wallet',
        subtitle: 'Manage credentials, share proofs, and verify profile.',
        color: colors.holder,
      },
      issuer: {
        title: 'Issuer Console',
        subtitle: 'Issue and revoke credentials with audit-safe workflows.',
        color: colors.issuer,
      },
      recruiter: {
        title: 'Recruiter Verify',
        subtitle: 'Run instant verification and track risk signals.',
        color: colors.recruiter,
      },
    }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>CredVerse Mobile</Text>
      <Text style={styles.title}>Choose your role</Text>
      <Text style={styles.subtitle}>Sessions are isolated by role. Switch anytime.</Text>

      {(['holder', 'issuer', 'recruiter'] as AppRole[]).map((role) => {
        const entry = ROLE_COPY[role];
        return (
          <Pressable
            key={role}
            onPress={() => onSelectRole(role)}
            style={[styles.card, { borderColor: entry.color }]}
          >
            <View style={[styles.accentBar, { backgroundColor: entry.color }]} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{entry.title}</Text>
              <Text style={styles.cardSubtitle}>{entry.subtitle}</Text>
              <Text style={styles.cardAction}>Continue</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
      paddingTop: 72,
      gap: 14,
    },
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
      fontSize: 28,
      fontWeight: '800',
      fontFamily: 'Inter_800ExtraBold',
    },
    subtitle: {
      color: colors.muted,
      fontFamily: 'Inter_400Regular',
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 6,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    accentBar: {
      width: 6,
      height: 58,
      borderRadius: 999,
      marginRight: 12,
    },
    cardContent: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      fontFamily: 'Inter_700Bold',
    },
    cardSubtitle: {
      color: colors.muted,
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
    },
    cardAction: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.4,
      marginTop: 4,
    },
  });
}
