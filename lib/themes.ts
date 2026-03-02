export interface DayTheme {
  id: string;
  name: string;
  // Backgrounds
  bgGradient: string;        // CSS gradient for main container
  headerBorder: string;      // border-color for header/section dividers
  cardBg: string;            // event block background base (hex, alpha appended in code)
  // Text
  textPrimary: string;       // main headings, event titles
  textSecondary: string;     // date label, sub-text
  textMuted: string;         // hour labels, metadata
  // Accent (clock AM/PM, day-start label, now-line, progress bar)
  accent: string;
  // Progress bar
  progressBg: string;        // track background
  progressFill: string;      // fill gradient (CSS gradient or solid color)
  // Now line
  nowLine: string;
  // Hour grid lines (rgba string)
  gridLine: string;
  // Clock seconds color
  clockSeconds: string;
}

export const THEMES: DayTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight (Default)',
    bgGradient: 'linear-gradient(160deg, #060b18 0%, #0a0f1e 60%, #060d14 100%)',
    headerBorder: '#1e2d4a',
    cardBg: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#4b5563',
    accent: '#60a5fa',
    progressBg: 'rgba(255,255,255,0.05)',
    progressFill: 'linear-gradient(to right, #2563eb, #60a5fa)',
    nowLine: '#60a5fa',
    gridLine: 'rgba(255,255,255,0.05)',
    clockSeconds: '#374151',
  },
  {
    id: 'slate',
    name: 'Slate',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
    headerBorder: '#334155',
    cardBg: '#ffffff',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    accent: '#38bdf8',
    progressBg: 'rgba(255,255,255,0.07)',
    progressFill: 'linear-gradient(to right, #0284c7, #38bdf8)',
    nowLine: '#38bdf8',
    gridLine: 'rgba(255,255,255,0.06)',
    clockSeconds: '#475569',
  },
  {
    id: 'corporate',
    name: 'Corporate Light',
    bgGradient: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%)',
    headerBorder: '#cbd5e1',
    cardBg: '#000000',
    textPrimary: '#0f172a',
    textSecondary: '#1e293b',
    textMuted: '#94a3b8',
    accent: '#2563eb',
    progressBg: 'rgba(0,0,0,0.08)',
    progressFill: 'linear-gradient(to right, #1d4ed8, #3b82f6)',
    nowLine: '#2563eb',
    gridLine: 'rgba(0,0,0,0.07)',
    clockSeconds: '#94a3b8',
  },
  {
    id: 'forest',
    name: 'Forest',
    bgGradient: 'linear-gradient(160deg, #052e16 0%, #064e3b 60%, #022c22 100%)',
    headerBorder: '#065f46',
    cardBg: '#ffffff',
    textPrimary: '#ecfdf5',
    textSecondary: '#d1fae5',
    textMuted: '#6b7280',
    accent: '#34d399',
    progressBg: 'rgba(255,255,255,0.05)',
    progressFill: 'linear-gradient(to right, #059669, #34d399)',
    nowLine: '#34d399',
    gridLine: 'rgba(255,255,255,0.05)',
    clockSeconds: '#374151',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    bgGradient: 'linear-gradient(160deg, #1c0533 0%, #2d1b69 60%, #1a0a2e 100%)',
    headerBorder: '#4c1d95',
    cardBg: '#ffffff',
    textPrimary: '#faf5ff',
    textSecondary: '#ede9fe',
    textMuted: '#7c3aed',
    accent: '#a78bfa',
    progressBg: 'rgba(255,255,255,0.05)',
    progressFill: 'linear-gradient(to right, #7c3aed, #a78bfa)',
    nowLine: '#a78bfa',
    gridLine: 'rgba(255,255,255,0.05)',
    clockSeconds: '#4c1d95',
  },
  {
    id: 'ember',
    name: 'Ember',
    bgGradient: 'linear-gradient(160deg, #1c0a00 0%, #292524 60%, #1c0a00 100%)',
    headerBorder: '#44403c',
    cardBg: '#ffffff',
    textPrimary: '#fafaf9',
    textSecondary: '#e7e5e4',
    textMuted: '#78716c',
    accent: '#fb923c',
    progressBg: 'rgba(255,255,255,0.05)',
    progressFill: 'linear-gradient(to right, #ea580c, #fb923c)',
    nowLine: '#fb923c',
    gridLine: 'rgba(255,255,255,0.05)',
    clockSeconds: '#57534e',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    bgGradient: 'linear-gradient(160deg, #ecfeff 0%, #cffafe 60%, #e0f2fe 100%)',
    headerBorder: '#a5f3fc',
    cardBg: '#000000',
    textPrimary: '#083344',
    textSecondary: '#164e63',
    textMuted: '#67e8f9',
    accent: '#0891b2',
    progressBg: 'rgba(0,0,0,0.06)',
    progressFill: 'linear-gradient(to right, #0e7490, #06b6d4)',
    nowLine: '#0891b2',
    gridLine: 'rgba(0,0,0,0.07)',
    clockSeconds: '#a5f3fc',
  },
  {
    id: 'custom',
    name: 'Custom',
    bgGradient: 'linear-gradient(160deg, #060b18 0%, #0a0f1e 60%, #060d14 100%)',
    headerBorder: '#1e2d4a',
    cardBg: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#4b5563',
    accent: '#60a5fa',
    progressBg: 'rgba(255,255,255,0.05)',
    progressFill: 'linear-gradient(to right, #2563eb, #60a5fa)',
    nowLine: '#60a5fa',
    gridLine: 'rgba(255,255,255,0.05)',
    clockSeconds: '#374151',
  },
];

export const DEFAULT_THEME = THEMES[0];

export function getTheme(id: string, customJson?: string): DayTheme {
  if (id === 'custom' && customJson) {
    try {
      const custom = JSON.parse(customJson) as Partial<DayTheme>;
      return { ...THEMES.find(t => t.id === 'custom')!, ...custom, id: 'custom' };
    } catch { /* fall through */ }
  }
  return THEMES.find(t => t.id === id) ?? DEFAULT_THEME;
}
