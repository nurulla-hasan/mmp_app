import { Colors } from '../../../constants/colors';

export type ToolThemeName = keyof typeof Colors;

export function getLandMeasurementToolColors(theme: ToolThemeName) {
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  return {
    ...colors,
    workspace: colors.background,
    panel: isDark ? '#0f172a' : '#ffffff',
    panelAlt: isDark ? '#111827' : '#f8fafc',
    panelRaised: isDark ? '#1e293b' : '#f1f5f9',
    panelBorder: colors.border,
    overlay: isDark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
    overlayStrong: isDark ? 'rgba(2,6,23,0.70)' : 'rgba(15,23,42,0.28)',
    iconMuted: isDark ? '#94a3b8' : '#64748b',
    textStrong: colors.text,
    textSoft: colors.textMuted,
    danger: '#ef4444',
    success: isDark ? '#22c55e' : '#16a34a',
    blue: isDark ? '#60a5fa' : '#2563eb',
    blueBg: isDark ? '#1e3a8a' : '#dbeafe',
    blueText: isDark ? '#bfdbfe' : '#1d4ed8',
    input: colors.inputBg,
  };
}
