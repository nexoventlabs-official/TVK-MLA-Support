// Brand colours match the two web apps (Tailwind brand-* palette derived
// from the TVK flag: deep green primary, warm red accent, off-white card
// background, near-black text).

export const colors = {
  // Primary TVK Red Palette
  brand50: '#fef2f2',
  brand100: '#fee2e2',
  brand200: '#fecaca',
  brand300: '#fca5a5',
  brand400: '#f87171',
  brand500: '#ef4444',
  brand600: '#dc2626',
  brand700: '#990000', // Core TVK Red
  brand800: '#800000',
  brand900: '#660000',
  tvkYellow: '#FFD700',

  // Accents
  red: '#c53030',
  redSoft: '#fee2e2',
  amber: '#b45309',
  amberSoft: '#fef3c7',
  blue: '#1d4ed8',
  blueSoft: '#dbeafe',

  // Greys
  bg: '#ffffff',
  card: '#ffffff',
  border: '#e7e5e4',
  borderStrong: '#d6d3d1',
  text: '#0c0a09',
  textMuted: '#57534e',
  textFaint: '#a8a29e',

  // Status (matches ServiceRequest enum)
  statusPending: '#b45309',
  statusAccepted: '#1d4ed8',
  statusProcessing: '#7c3aed',
  statusCompleted: '#15803d',
  statusRejected: '#b91c1c',
};

export const statusColor = (status) => ({
  pending: colors.statusPending,
  accepted: colors.statusAccepted,
  processing: colors.statusProcessing,
  completed: colors.statusCompleted,
  resolved: colors.statusCompleted,
  rejected: colors.statusRejected,
  new: colors.statusPending,
  in_progress: colors.statusProcessing,
}[status] || colors.textMuted);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
  captionBold: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  tabular: { fontVariant: ['tabular-nums'] },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};
