export interface ColorPalette {
  // Backgrounds
  bg: string;
  card: string;
  input: string;
  elevated: string; // alias of input; kept for migration compat
  surfaceMuted: string;

  // Typography
  text: string;
  muted: string;

  // Structure
  border: string;
  shadow: string;
  overlay: string;

  // Brand
  primary: string;

  // Semantic states
  success: string;
  warning: string;
  danger: string;

  // Semantic surfaces (status badges, approve/deny buttons, etc.)
  successSurface: string;
  successOnSurface: string;
  warningSurface: string;
  warningOnSurface: string;
  dangerSurface: string;
  dangerOnSurface: string;

  // Credential card gradient border
  gradientStart: string;
  gradientEnd: string;

  // Type badge in credential cards
  badgeSurface: string;
  badgeBorder: string;
  badgeText: string;

  // Role accents
  holder: string;
  issuer: string;
  recruiter: string;

  // Tier colors
  tier: {
    unverified: string;
    bronze: string;
    silver: string;
    gold: string;
    platinum: string;
    diamond: string;
  };
}

export const lightColors: ColorPalette = {
  // Backgrounds — from BlockWalletDigi HSL vars
  bg: '#F7F9FC',           // hsl(210 20% 98%)
  card: '#FFFFFF',
  input: '#F0F4FA',        // hsl(216 33% 96%)
  elevated: '#F0F4FA',
  surfaceMuted: '#E8EEF7',

  // Typography
  text: '#0A0F1E',
  muted: '#6B7280',        // hsl(215.4 16.3% 46.9%)

  // Structure
  border: '#D8E0EC',       // hsl(214.3 31.8% 91.4%)
  shadow: '#0F172A',
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Brand
  primary: '#0055FF',      // hsl(220 100% 50%)

  // Semantic states
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#E85D5D',       // hsl(0 84.2% 60.2%)

  // Semantic surfaces
  successSurface: '#DCFCE7',
  successOnSurface: '#166534',
  warningSurface: '#FEF3C7',
  warningOnSurface: '#92400E',
  dangerSurface: '#FEE2E2',
  dangerOnSurface: '#991B1B',

  // Gradient border
  gradientStart: '#DBEAFE',
  gradientEnd: '#D1FAE5',

  // Type badge
  badgeSurface: '#EFF6FF',
  badgeBorder: '#BFDBFE',
  badgeText: '#1E40AF',

  // Role accents
  holder: '#10B981',
  issuer: '#0055FF',
  recruiter: '#F59E0B',

  // Tier
  tier: {
    unverified: '#9CA3AF',
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  },
};

export const darkColors: ColorPalette = {
  // Backgrounds — from BlockWalletDigi dark HSL vars
  bg: '#0D1526',           // hsl(222 47% 11%)
  card: '#101B2E',         // hsl(222 47% 13%)
  input: '#1A2540',        // hsl(217 33% 17%)
  elevated: '#1A2540',
  surfaceMuted: '#1A2540',

  // Typography
  text: '#F0F4FC',         // hsl(210 40% 98%)
  muted: '#8CA4C8',        // hsl(215 20% 65%)

  // Structure
  border: '#1E2F4A',       // hsl(217 33% 20%)
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',

  // Brand
  primary: '#4E86F5',      // hsl(217 91% 60%)

  // Semantic states
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',

  // Semantic surfaces
  successSurface: '#052E16',
  successOnSurface: '#4ADE80',
  warningSurface: '#422006',
  warningOnSurface: '#FBBF24',
  dangerSurface: '#450A0A',
  dangerOnSurface: '#F87171',

  // Gradient border
  gradientStart: '#1E3A5F',
  gradientEnd: '#1A3A2E',

  // Type badge
  badgeSurface: '#172554',
  badgeBorder: '#1E40AF',
  badgeText: '#93C5FD',

  // Role accents
  holder: '#34D399',
  issuer: '#4E86F5',
  recruiter: '#FBBF24',

  // Tier
  tier: {
    unverified: '#64748B',
    bronze: '#CD7F32',
    silver: '#A8A8A8',
    gold: '#FFD700',
    platinum: '#D0D0CE',
    diamond: '#7CE8FF',
  },
};

// Backward-compatible default — light palette.
// Static module-level imports that haven't been migrated to useTheme()
// will get light-mode colors as a safe fallback.
export const colors = lightColors;

// Typography — static, not mode-dependent
export const typography = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export type Typography = typeof typography;
