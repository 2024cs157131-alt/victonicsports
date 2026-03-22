export const BASE_JSON          = process.env.NEXT_PUBLIC_BASE_JSON_URL ?? 'https://surveyiz.github.io/AJTips'
export const API_FOOTBALL_KEY   = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY ?? ''
export const PAYSTACK_PUBLIC_KEY= process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ''
export const API_FOOTBALL_URL   = 'https://v3.football.api-sports.io'

// ── Exact colors from the Android app ────────────────────────────────────────
export const COLORS = {
  darkBackground: '#0F1218',
  darkCard:       '#1A1D24',
  darkCardHover:  '#232832',
  scoresGreen:    '#00C853',
  timeRed:        '#D32F2F',
  goldColor:      '#FFD700',
  purpleColor:    '#AB47BC',
  muted:          '#9E9E9E',
  border:         '#2C2F38',
}

// ── League priorities (exact from app) ───────────────────────────────────────
export const LEAGUE_PRIORITY: Record<number, number> = {
  2:0, 3:1, 848:2,            // UCL, UEL, UECL
  39:3, 140:4, 135:5, 78:6, 61:7,  // Top 5 leagues
  45:8, 48:9, 143:10, 137:11, 81:12, 66:13, // Cups
  94:14, 88:15, 179:16, 144:17, 307:18, 203:19, 253:20, 262:21, 128:22,
  40:23, 79:24, 136:25, 141:26, 62:27,
  197:28, 119:29, 113:30, 103:31, 333:32, 292:33,
}

export const MAJOR_LEAGUE_IDS = new Set([
  2, 3, 848, 39, 140, 135, 78, 61, 45, 48, 94, 88, 307, 203, 253, 262, 128
])

export const COUNTRY_MAP: Record<number, [string, string]> = {
  2:['🇪🇺','Europe'], 3:['🇪🇺','Europe'], 848:['🇪🇺','Europe'],
  39:['🏴󠁧󠁢󠁥󠁮󠁧󠁿','England'], 40:['🏴󠁧󠁢󠁥󠁮󠁧󠁿','England'], 41:['🏴󠁧󠁢󠁥󠁮󠁧󠁿','England'],
  140:['🇪🇸','Spain'], 141:['🇪🇸','Spain'],
  135:['🇮🇹','Italy'], 136:['🇮🇹','Italy'],
  78:['🇩🇪','Germany'], 79:['🇩🇪','Germany'],
  61:['🇫🇷','France'], 62:['🇫🇷','France'],
  94:['🇵🇹','Portugal'], 88:['🇳🇱','Netherlands'],
  179:['🏴󠁧󠁢󠁳󠁣󠁴󠁿','Scotland'], 144:['🇧🇪','Belgium'],
  262:['🇲🇽','Mexico'], 253:['🇺🇸','USA'],
  307:['🇸🇦','Saudi Arabia'], 203:['🇹🇷','Turkey'],
  197:['🇬🇷','Greece'], 119:['🇩🇰','Denmark'],
  113:['🇸🇪','Sweden'], 103:['🇳🇴','Norway'],
  333:['🇿🇦','South Africa'], 128:['🇦🇷','Argentina'],
  292:['🇰🇷','South Korea'], 98:['🇯🇵','Japan'],
  169:['🇧🇷','Brazil'], 71:['🇧🇷','Brazil'],
}

export const LIVE_STATUSES     = ['1H','2H','HT','LIVE','ET','BT','P','INT']
export const FINISHED_STATUSES = ['FT','AET','PEN','AWD','WO']

export const SOCIAL = {
  youtube:   'https://www.youtube.com/@victonicsports',
  tiktok:    'https://www.tiktok.com/@victonicsports',
  instagram: 'https://www.instagram.com/victonicsports_/',
  facebook:  'https://web.facebook.com/profile.php?id=61586431353347',
}

export function getLeaguePriority(id: number, name: string): number {
  return LEAGUE_PRIORITY[id] ?? (Object.keys(LEAGUE_PRIORITY).length + (name.charCodeAt(0) || 90))
}

export function getCountryInfo(leagueId: number, fallback = ''): [string, string] {
  return COUNTRY_MAP[leagueId] ?? ['🌍', fallback || 'International']
}

export function computeConfidence(leagueId: number, tip: string): number {
  const pri = LEAGUE_PRIORITY[leagueId] ?? 99
  const base = pri <= 4 ? 88 : pri <= 8 ? 85 : pri <= 14 ? 82 : 80
  const bonus = tip.includes('Over 1.5') ? 3 : tip.includes('Home Win') ? 2 : 1
  return Math.min(96, base + bonus)
}

export function getTipForLeague(leagueId: number): string {
  const pri = LEAGUE_PRIORITY[leagueId] ?? 99
  if (pri <= 4) return 'Home Win or Draw'
  if (pri <= 9) return 'Over 1.5 Goals'
  return 'Both Teams to Score'
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Premium Tips':       '#FFD700',
  'Daily Correct Score':'#AB47BC',
  'Draw Tips':          '#1E88E5',
  'Basic Tips':         '#00C853',
  'Free Tips':          '#FF7043',
}
