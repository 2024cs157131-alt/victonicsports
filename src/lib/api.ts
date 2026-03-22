import { BASE_JSON, API_FOOTBALL_KEY, API_FOOTBALL_URL, LEAGUE_PRIORITY, MAJOR_LEAGUE_IDS, getLeaguePriority, LIVE_STATUSES } from './config'
import type { Fixture, Package, HistoryBatch, JackpotData, MatchPrediction, SupportConfig } from './types'

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, next: { revalidate: 300 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export const loadSupport    = () => fetchJson<SupportConfig>(`${BASE_JSON}/support.json`)
export const loadTestMode   = () => fetchJson<{ testMode: boolean }>(`${BASE_JSON}/TestMode.json`)
export const loadPackages   = () => fetchJson<Package[]>(`${BASE_JSON}/packages.json`)
export const loadHistory    = () => fetchJson<HistoryBatch[]>(`${BASE_JSON}/history.json`)
export const loadPremiumTips= () => fetchJson<MatchPrediction[]>(`${BASE_JSON}/premium.json`)
export const loadBasicTips  = () => fetchJson<MatchPrediction[]>(`${BASE_JSON}/basic.json`)
export const loadDrawsTips  = () => fetchJson<MatchPrediction[]>(`${BASE_JSON}/draws.json`)
export const loadCorrectTips= () => fetchJson<MatchPrediction[]>(`${BASE_JSON}/correct.json`)
export const loadJackpotSP  = () => fetchJson<JackpotData>(`${BASE_JSON}/jackpot_sportpesa.json`)
export const loadJackpotMega= () => fetchJson<JackpotData>(`${BASE_JSON}/jackpot_mega.json`)
export const loadJackpotBet = () => fetchJson<JackpotData>(`${BASE_JSON}/jackpot_betika.json`)

export async function fetchFixtures(date: string): Promise<Fixture[]> {
  if (!API_FOOTBALL_KEY) return []
  const data = await fetchJson<any>(
    `${API_FOOTBALL_URL}/fixtures?date=${date}&timezone=Africa/Nairobi`,
    { 'x-apisports-key': API_FOOTBALL_KEY }
  )
  if (!data?.response) return []
  return data.response.map((f: any): Fixture => ({
    id:             f.fixture.id,
    leagueId:       f.league.id,
    leagueName:     f.league.name,
    leagueLogo:     f.league.logo,
    leagueCountry:  f.league.country ?? '',
    homeName:       f.teams.home.name,
    homeLogo:       f.teams.home.logo,
    homeScore:      String(f.goals.home ?? '-'),
    awayName:       f.teams.away.name,
    awayLogo:       f.teams.away.logo,
    awayScore:      String(f.goals.away ?? '-'),
    status:         f.fixture.status.short,
    elapsed:        String(f.fixture.status.elapsed ?? ''),
    kickoffTime:    new Date((f.fixture.timestamp + 10800) * 1000).toISOString().slice(11, 16),
  }))
}

export function pickFreeFixtures(fixtures: Fixture[]): Fixture[] {
  const ns   = fixtures.filter(f => f.status === 'NS')
  const seed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
  const arr  = [...ns]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.abs((seed + i * 2654435761) % (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const seen = new Set<number>()
  return arr.filter(f => {
    if (seen.has(f.leagueId)) return false
    seen.add(f.leagueId); return true
  }).slice(0, 6)
}

export function groupAndSortFixtures(fixtures: Fixture[], liveOnly = false): Map<number, Fixture[]> {
  const filtered = liveOnly
    ? fixtures.filter(f => LIVE_STATUSES.includes(f.status) || (f.status === 'NS' && MAJOR_LEAGUE_IDS.has(f.leagueId)))
    : fixtures
  const map = new Map<number, Fixture[]>()
  for (const f of filtered) {
    if (!map.has(f.leagueId)) map.set(f.leagueId, [])
    map.get(f.leagueId)!.push(f)
  }
  for (const arr of map.values())
    arr.sort((a, b) => {
      const aL = LIVE_STATUSES.includes(a.status) ? 0 : 1
      const bL = LIVE_STATUSES.includes(b.status) ? 0 : 1
      return aL - bL || a.kickoffTime.localeCompare(b.kickoffTime)
    })
  return new Map(Array.from(map.entries()).sort(([aId, aArr], [bId, bArr]) => {
    const aL = aArr.some(f => LIVE_STATUSES.includes(f.status)) ? 0 : 1
    const bL = bArr.some(f => LIVE_STATUSES.includes(f.status)) ? 0 : 1
    if (aL !== bL) return aL - bL
    return getLeaguePriority(aId, aArr[0].leagueName) - getLeaguePriority(bId, bArr[0].leagueName)
  }))
}

export function getOffsetDate(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
