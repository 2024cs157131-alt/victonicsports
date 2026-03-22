export interface Fixture {
  id: number
  leagueId: number; leagueName: string; leagueLogo: string; leagueCountry: string
  homeName: string; homeLogo: string; homeScore: string
  awayName: string; awayLogo: string; awayScore: string
  status: string; elapsed: string; kickoffTime: string
}

export interface MatchPrediction {
  teamA: string; teamB: string
  iconA: string;  iconB: string
  league: string; leagueLogo: string
  kickOff: string; tip: string; odds: string
  isLocked?: boolean
}

export interface JackpotMatch {
  teamA: string; teamB: string
  iconA: string;  iconB: string
  league: string; leagueLogo: string
  kickOff: string; tip: string; odds: string
}

export interface JackpotData {
  bookmaker: string; logoUrl: string
  jackpotAmount: string; matches: JackpotMatch[]
}

export interface PriceTier {
  amount: number; duration: string
  baseCurrency: string; planCode: string
}

export interface JackpotTier {
  bookmaker: string; amount: number; baseCurrency: string
}

export interface Package {
  id: string; title: string; subtitle: string; features: string[]
  price: { name: string; prices: PriceTier[]; jackpots: JackpotTier[] }
  type: string; isMostPopular: boolean; kenyaOnly: boolean
}

export interface HistoryMatch {
  teamA: string; teamB: string
  homeLogo: string; awayLogo: string
  prediction: string; odds: string; result: string; score: string
}

export interface HistoryBatch {
  date: string
  categories: Record<string, HistoryMatch[]>
}

export interface SupportConfig {
  whatsapp: string; telegram: string; email: string
  adsense_client: string; adsense_slot: string
}
