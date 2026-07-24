export const tokens = {
  colors: {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#14141f',
    bgTertiary: '#1e1e2e',
    surfaceElevated: '#252536',
    purpleDeep: '#6b21a8',
    purpleLight: '#9333ea',
    gold: '#f59e0b',
    orange: '#ea580c',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    borderSubtle: '#1e293b',
    success: '#22c55e',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
} as const;

export type UiTokens = typeof tokens;
