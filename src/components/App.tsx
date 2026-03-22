'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Fixture, SupportConfig, Package, HistoryBatch, MatchPrediction, JackpotData } from '@/lib/types'
import {
  fetchFixtures, pickFreeFixtures, groupAndSortFixtures,
  loadPackages, loadHistory, loadPremiumTips, loadBasicTips,
  loadDrawsTips, loadCorrectTips, loadJackpotSP, loadJackpotMega,
  loadJackpotBet, getOffsetDate,
} from '@/lib/api'
import {
  COLORS, LIVE_STATUSES, FINISHED_STATUSES, MAJOR_LEAGUE_IDS,
  LEAGUE_PRIORITY, SOCIAL, getCountryInfo, getTipForLeague,
  computeConfidence, CATEGORY_COLORS,
} from '@/lib/config'
import { hasAccess, grantAccess, expiryLabel, anyAccess, durationDays, openPaystack, genRef } from '@/lib/vip'

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'live' | 'scores' | 'free' | 'vip' | 'history' | 'support'

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const C = COLORS
const FB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23232832'/%3E%3C/svg%3E"

function TeamLogo({ src, size = 28, circle = true }: { src: string; size?: number; circle?: boolean }) {
  return (
    <img
      src={src || FB}
      width={size} height={size}
      onError={e => { (e.target as HTMLImageElement).src = FB }}
      style={{
        objectFit: 'contain',
        borderRadius: circle ? '50%' : 6,
        background: '#fff',
        padding: 2,
        flexShrink: 0,
      }}
      alt=""
    />
  )
}

function LeagueLogo({ src, size = 24 }: { src: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: '#fff', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, padding: 2, overflow: 'hidden',
    }}>
      <img src={src || FB} width={size - 4} height={size - 4}
        onError={e => { (e.target as HTMLImageElement).src = FB }}
        style={{ objectFit: 'contain' }} alt="" />
    </div>
  )
}

function Chip({ children, color = C.scoresGreen, bg }: { children: any; color?: string; bg?: string }) {
  return (
    <span style={{
      background: bg ?? color + '22',
      color, fontSize: 11, fontWeight: 700,
      padding: '2px 10px', borderRadius: 20, flexShrink: 0,
    }}>{children}</span>
  )
}

function Spinner({ size = 24, color = C.scoresGreen }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function StatusBadge({ status, elapsed }: { status: string; elapsed: string }) {
  const isLive = LIVE_STATUSES.includes(status)
  const isFT   = FINISHED_STATUSES.includes(status)
  const text   = status === 'HT' ? 'HT' : isLive && elapsed ? `${elapsed}'` : isLive ? 'LIVE' : isFT ? 'FT' : status === 'NS' ? '' : status
  if (!text && status !== 'NS') return null
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
      background: isLive ? C.timeRed + '22' : isFT ? '#2E7D3222' : '#1E88E522',
      color: isLive ? C.timeRed : isFT ? '#66bb6a' : '#90CAF9',
      letterSpacing: 0.5,
    }}>{text}</span>
  )
}

function SectionTitle({ children }: { children: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 22, letterSpacing: 1, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>{children}</span>
    </div>
  )
}

function EmptyState({ icon, text, onRetry }: { icon: string; text: string; onRetry?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 14, marginBottom: onRetry ? 16 : 0 }}>{text}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: C.scoresGreen, color: '#000',
          border: 'none', borderRadius: 8, padding: '8px 20px',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>Retry</button>
      )}
    </div>
  )
}

// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.darkBackground,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, zIndex: 999,
    }}>
      {/* Logo */}
      <div style={{
        width: 90, height: 90, borderRadius: '50%',
        background: C.scoresGreen + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 40px ${C.scoresGreen}44`,
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <span style={{ fontSize: 44 }}>⚽</span>
      </div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 40, letterSpacing: 4, color: C.scoresGreen,
      }}>
        AJ<span style={{ color: '#fff' }}>Tips</span>
      </div>
      <div style={{ color: C.muted, fontSize: 13 }}>Live Football HD</div>
      <div style={{ position: 'absolute', bottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={28} />
        <span style={{ color: C.muted, fontSize: 12 }}>Loading...</span>
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 20px ${C.scoresGreen}33} 50%{box-shadow:0 0 50px ${C.scoresGreen}66} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

// ─── NO INTERNET ──────────────────────────────────────────────────────────────
function NoInternet() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 20,
      background: C.darkBackground,
    }}>
      <span style={{ fontSize: 56 }}>📡</span>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.timeRed }}>NO CONNECTION</div>
      <p style={{ color: C.muted, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
        Check your internet connection and try again.
      </p>
      <button onClick={() => window.location.reload()} style={{
        background: C.scoresGreen, color: '#000', border: 'none',
        borderRadius: 10, padding: '11px 28px', fontWeight: 700, fontSize: 14,
      }}>Try Again</button>
    </div>
  )
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
function Maintenance() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 20,
      background: C.darkBackground, textAlign: 'center',
    }}>
      <span style={{ fontSize: 60 }}>🔧</span>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, color: C.scoresGreen, letterSpacing: 2 }}>MAINTENANCE</div>
      <p style={{ color: C.muted, maxWidth: 340, lineHeight: 1.7 }}>
        AJ Tips is being updated. We'll be back shortly with today's best predictions.
      </p>
    </div>
  )
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ visible }: { visible: boolean }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleString('en-GB', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      background: C.darkBackground, borderBottom: `1px solid ${C.darkCardHover}`,
      position: 'sticky', top: 0, zIndex: 100,
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.2s ease',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center',
        padding: '10px 16px', gap: 10,
      }}>
        {/* Logo */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: C.scoresGreen + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>⚽</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: C.scoresGreen, letterSpacing: 1 }}>
            Live Football HD
          </span>
          {time && <span style={{ fontSize: 12, color: C.muted }}>• {time}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, liveCount, vipAccess }: {
  tab: Tab; setTab: (t: Tab) => void; liveCount: number; vipAccess: boolean
}) {
  const items: [Tab, string, string][] = [
    ['live',    '📺', 'Live'],
    ['scores',  '📊', 'Scores'],
    ['free',    '⚽', 'Free'],
    ['vip',     '💎', 'VIP'],
    ['history', '🏆', 'History'],
    ['support', '💬', 'Support'],
  ]
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.darkCard, borderTop: `1px solid ${C.darkCardHover}`,
      display: 'flex', zIndex: 100,
    }}>
      {items.map(([id, icon, label]) => {
        const active = tab === id
        const color  = id === 'live' ? C.timeRed : C.scoresGreen
        return (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '8px 2px 6px',
            background: 'none', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            cursor: 'pointer', position: 'relative',
          }}>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              {id === 'live' && liveCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: C.timeRed, color: '#fff',
                  fontSize: 8, fontWeight: 700,
                  padding: '1px 4px', borderRadius: 10, minWidth: 14, textAlign: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}>{liveCount}</span>
              )}
              {id === 'vip' && vipAccess && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: C.scoresGreen, color: '#000',
                  fontSize: 8, fontWeight: 700,
                  padding: '1px 4px', borderRadius: 10,
                }}>✓</span>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 400,
              color: active ? color : C.muted,
              maxWidth: 50, textAlign: 'center', lineHeight: 1.1,
            }}>{label}</span>
            {active && <div style={{
              position: 'absolute', bottom: 0, left: '20%', right: '20%',
              height: 2, background: color, borderRadius: 1,
            }}/>}
          </button>
        )
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </nav>
  )
}

// ─── AD UNIT ─────────────────────────────────────────────────────────────────
function AdUnit({ client, slot }: { client: string; slot?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!client || !ref.current) return
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}) }
    catch {}
  }, [client])
  if (!client) return null
  return (
    <div ref={ref} style={{
      background: C.darkCard, border: `1px solid ${C.darkCardHover}`,
      borderRadius: 10, padding: 8, margin: '12px 0',
      minHeight: 80, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, alignSelf: 'flex-start' }}>Advertisement</div>
      <ins className="adsbygoogle" style={{ display: 'block', width: '100%' }}
        data-ad-client={client} data-ad-slot={slot}
        data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  )
}

// ─── LIVE TAB ─────────────────────────────────────────────────────────────────
function LiveTab({ fixtures, loading, adsense }: { fixtures: Fixture[]; loading: boolean; adsense: SupportConfig }) {
  const grouped = groupAndSortFixtures(fixtures, true)
  const liveCount = fixtures.filter(f => LIVE_STATUSES.includes(f.status)).length
  const total = Array.from(grouped.values()).flat().length

  return (
    <div>
      {/* Header bar */}
      <div style={{
        background: C.darkCard, padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${C.darkCardHover}`,
      }}>
        {liveCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.timeRed, animation: 'pulse 1s infinite' }} />
            <span style={{ color: C.timeRed, fontWeight: 700, fontSize: 13 }}>LIVE STREAMS</span>
          </div>
        )}
        {!liveCount && <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>⚡ Today's Matches</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {liveCount > 0 && <Chip color={C.timeRed}>{liveCount} LIVE</Chip>}
          <Chip>{total} total</Chip>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={36} />
        </div>
      )}
      {!loading && grouped.size === 0 && (
        <EmptyState icon="📺" text="No streams or fixtures available right now." />
      )}

      {Array.from(grouped.entries()).map(([leagueId, matches], gi) => {
        const f0 = matches[0]
        const [flag, country] = getCountryInfo(leagueId, f0.leagueCountry)
        const hasLive = matches.filter(f => LIVE_STATUSES.includes(f.status)).length
        return (
          <div key={leagueId} className="fade">
            {/* League header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', background: C.darkCard,
              borderBottom: `1px solid ${C.darkCardHover}`,
              marginTop: gi > 0 ? 1 : 0,
            }}>
              <LeagueLogo src={f0.leagueLogo} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f0.leagueName}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{flag} {country}</div>
              </div>
              {hasLive > 0
                ? <Chip color={C.timeRed}>{hasLive} LIVE</Chip>
                : <Chip>{matches.length}</Chip>}
            </div>

            {/* Match rows */}
            {matches.map(f => {
              const isLive = LIVE_STATUSES.includes(f.status)
              const isFT   = FINISHED_STATUSES.includes(f.status)
              return (
                <div key={f.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 1fr',
                  alignItems: 'center', padding: '12px 16px',
                  background: C.darkBackground,
                  borderBottom: `1px solid ${C.darkCardHover}11`,
                  transition: 'background 0.15s',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo src={f.homeLogo} size={26} />
                    <span style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{f.homeName}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {isLive || isFT ? (
                      <>
                        <div style={{
                          fontFamily: "'Bebas Neue',sans-serif", fontSize: 22,
                          letterSpacing: 2, color: isLive ? C.timeRed : '#fff',
                        }}>{f.homeScore} – {f.awayScore}</div>
                        <StatusBadge status={f.status} elapsed={f.elapsed} />
                      </>
                    ) : (
                      <>
                        <div style={{ color: C.scoresGreen, fontSize: 13, fontWeight: 700 }}>{f.kickoffTime}</div>
                        <StatusBadge status={f.status} elapsed={f.elapsed} />
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                    <TeamLogo src={f.awayLogo} size={26} />
                    <span style={{ fontWeight: 600, fontSize: 12, textAlign: 'right', lineHeight: 1.3 }}>{f.awayName}</span>
                  </div>
                </div>
              )
            })}
            {(gi + 1) % 4 === 0 && <AdUnit client={adsense.adsense_client} slot={adsense.adsense_slot} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── SCORES TAB ──────────────────────────────────────────────────────────────
function ScoresTab({ allFixtures, adsense }: { allFixtures: Map<string, Fixture[]>; adsense: SupportConfig }) {
  const [selectedOffset, setSelectedOffset] = useState<number | null>(0)
  const [loadingDate, setLoadingDate] = useState<string | null>(null)
  const [cache, setCache] = useState<Map<string, Fixture[]>>(allFixtures)

  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const chips = [
    { label: 'LIVE', sub: '', offset: null as null|number, isLive: true },
    ...[-3,-2,-1,0,1,2,3].map(off => {
      const d = new Date(); d.setDate(d.getDate() + off)
      return {
        label: off === 0 ? 'TODAY' : days[d.getDay()],
        sub: `${d.getDate()} ${d.toLocaleString('en',{month:'short'}).toUpperCase()}`,
        offset: off, isLive: false,
      }
    })
  ]

  const dateKey = selectedOffset === null ? null : getOffsetDate(selectedOffset)
  const fixtures = selectedOffset === null
    ? Array.from(cache.values()).flat().filter(f => LIVE_STATUSES.includes(f.status))
    : cache.get(dateKey!) ?? null

  useEffect(() => {
    if (selectedOffset === null) return
    const key = getOffsetDate(selectedOffset)
    if (cache.has(key)) return
    setLoadingDate(key)
    fetchFixtures(key).then(data => {
      setCache(prev => new Map(prev).set(key, data))
      setLoadingDate(null)
    })
  }, [selectedOffset])

  const grouped = groupAndSortFixtures(fixtures ?? [], false)
  const isLoading = loadingDate !== null

  // Featured tip for today
  const featured = selectedOffset === 0
    ? (fixtures ?? []).filter(f => f.status === 'NS').sort((a,b) => {
        return (LEAGUE_PRIORITY[b.leagueId]??99) < (LEAGUE_PRIORITY[a.leagueId]??99) ? 1 : -1
      })[0]
    : null

  return (
    <div>
      {/* Date chips */}
      <div style={{
        background: C.darkCard, borderBottom: `1px solid ${C.darkCardHover}`,
        overflowX: 'auto', whiteSpace: 'nowrap',
        display: 'flex', padding: '10px 12px', gap: 8,
        scrollbarWidth: 'none',
      }}>
        {chips.map(chip => {
          const sel = chip.offset === selectedOffset
          return (
            <button key={chip.offset ?? 'live'} onClick={() => setSelectedOffset(chip.offset)}
              style={{
                flexShrink: 0,
                background: sel ? (chip.isLive ? C.timeRed : C.scoresGreen) : C.darkCardHover,
                border: 'none', borderRadius: 20, padding: '6px 16px',
                cursor: 'pointer', minWidth: 60,
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              }}>
              {chip.isLive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sel ? '#fff' : C.timeRed }} />
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>LIVE</span>
                </div>
              )}
              {!chip.isLive && <>
                <span style={{ color: sel ? '#000' : '#fff', fontSize: 13, fontWeight: 700 }}>{chip.label}</span>
                {chip.sub && chip.label !== 'TODAY' && <span style={{ color: sel ? '#000' : C.muted, fontSize: 10 }}>{chip.sub}</span>}
              </>}
            </button>
          )
        })}
      </div>

      {isLoading && <div style={{ display:'flex', justifyContent:'center', padding: 60 }}><Spinner size={36} /></div>}

      {!isLoading && (
        <div className="fade">
          {/* Featured tip card */}
          {featured && (
            <div style={{
              margin: '12px 16px',
              background: '#1E2A3A', borderRadius: 14, padding: '14px',
              border: `1px solid ${C.goldColor}33`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{fontSize:14}}>💡</span>
                <span style={{ color: C.goldColor, fontWeight:700, fontSize:13 }}>Today's Sure Tip</span>
                <span style={{ marginLeft:'auto', background:C.darkCardHover, borderRadius:6, padding:'2px 8px', fontSize:11, color:C.muted }}>
                  ⏰ {featured.kickoffTime || 'Soon'}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <LeagueLogo src={featured.leagueLogo} size={14} />
                <span style={{ color:C.muted, fontSize:11 }}>{featured.leagueName}</span>
                <span style={{ color:C.muted, fontSize:10 }}>
                  {getCountryInfo(featured.leagueId, featured.leagueCountry).join(' ')}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
                  <TeamLogo src={featured.homeLogo} size={24} />
                  <span style={{ fontWeight:600, fontSize:12 }}>{featured.homeName}</span>
                </div>
                <span style={{ color:C.muted, fontSize:11 }}>vs</span>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:6, flexDirection:'row-reverse' }}>
                  <TeamLogo src={featured.awayLogo} size={24} />
                  <span style={{ fontWeight:600, fontSize:12, textAlign:'right' }}>{featured.awayName}</span>
                </div>
              </div>
              <div style={{ borderTop:`1px solid ${C.darkCardHover}`, paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ color:C.muted, fontSize:12 }}>Tip: </span>
                  <span style={{ color:C.scoresGreen, fontWeight:700, fontSize:12 }}>{getTipForLeague(featured.leagueId)}</span>
                </div>
                <Chip color={C.scoresGreen}>{computeConfidence(featured.leagueId, getTipForLeague(featured.leagueId))}% Confidence</Chip>
              </div>
            </div>
          )}

          {grouped.size === 0 && (
            <EmptyState icon="📅" text={selectedOffset === null ? 'No live matches right now.' : 'No matches found.'} />
          )}

          {Array.from(grouped.entries()).map(([leagueId, matches], gi) => {
            const f0 = matches[0]
            const [flag, country] = getCountryInfo(leagueId, f0.leagueCountry)
            const isTop = (LEAGUE_PRIORITY[leagueId] ?? 99) <= 7
            return (
              <div key={leagueId}>
                {/* League header */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px 4px' }}>
                  <LeagueLogo src={f0.leagueLogo} size={32} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontWeight:700, fontSize:15 }}>{f0.leagueName}</span>
                      {isTop && <Chip color={C.goldColor} bg={C.goldColor+'22'}>TOP</Chip>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                      <span style={{fontSize:11}}>{flag}</span>
                      <span style={{ color:C.muted, fontSize:11 }}>{country}</span>
                    </div>
                  </div>
                  <span style={{ color:C.muted, fontSize:18 }}>›</span>
                </div>

                {matches.map(m => {
                  const live = LIVE_STATUSES.includes(m.status)
                  const isNS = m.status === 'NS'
                  const timeText = isNS ? m.kickoffTime || '--:--'
                    : live && m.elapsed ? `${m.elapsed}'` : m.status
                  return (
                    <div key={m.id} style={{
                      display:'flex', alignItems:'center',
                      padding:'12px 16px 12px 60px', gap:12,
                      borderBottom:`1px solid ${C.darkCardHover}22`,
                    }}>
                      <div style={{ width:48, textAlign:'center', flexShrink:0 }}>
                        <div style={{ color: live ? C.timeRed : C.muted, fontSize:13, fontWeight:700 }}>{timeText}</div>
                        {live && <div style={{ width:6, height:6, borderRadius:'50%', background:C.timeRed, margin:'3px auto 0', animation:'pulse 1s infinite' }}/>}
                      </div>
                      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
                        <TeamLogo src={m.homeLogo} size={22} />
                        <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{m.homeName}</span>
                      </div>
                      <div style={{ textAlign:'center', minWidth:50 }}>
                        {!isNS
                          ? <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color: live ? C.timeRed : '#fff' }}>
                              {m.homeScore} – {m.awayScore}
                            </span>
                          : <span style={{ color:C.muted, fontSize:13 }}>vs</span>
                        }
                      </div>
                      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, flexDirection:'row-reverse' }}>
                        <TeamLogo src={m.awayLogo} size={22} />
                        <span style={{ fontWeight:600, fontSize:13, textAlign:'right', flex:1 }}>{m.awayName}</span>
                      </div>
                    </div>
                  )
                })}
                {(gi + 1) % 5 === 0 && <AdUnit client={adsense.adsense_client} slot={adsense.adsense_slot} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── FREE TAB ─────────────────────────────────────────────────────────────────
function FreeTab({ fixtures, isUnlocked, onUnlock, adsense }: {
  fixtures: Fixture[]; isUnlocked: boolean; onUnlock: () => void; adsense: SupportConfig
}) {
  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <SectionTitle>
        <span>⚽</span> Today's Free Tips
        <Chip>{fixtures.length}/6</Chip>
      </SectionTitle>

      {fixtures.length === 0 && <EmptyState icon="⚽" text="No fixtures available today." />}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {fixtures.map((f, i) => {
          const tip  = getTipForLeague(f.leagueId)
          const conf = computeConfidence(f.leagueId, tip)
          const [flag, country] = getCountryInfo(f.leagueId, f.leagueCountry)
          const isLive = LIVE_STATUSES.includes(f.status)
          const isFT   = FINISHED_STATUSES.includes(f.status)
          const homeG  = parseInt(f.homeScore) || 0
          const awayG  = parseInt(f.awayScore) || 0
          const won    = isFT && (
            tip.includes('Home Win') ? homeG >= awayG :
            tip.includes('Over 1.5') ? homeG + awayG > 1 :
            homeG > 0 && awayG > 0
          )

          return (
            <div key={f.id}>
              {/* Free tip card — white card like the app */}
              <div style={{
                background: '#F5F5F5', borderRadius: 16,
                padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                {/* League row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <LeagueLogo src={f.leagueLogo} size={16} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#555' }}>{f.leagueName}</div>
                    <div style={{ fontSize:10, color:'#888' }}>{flag} {country}</div>
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background: isLive ? '#D32F2F22' : isFT ? '#2E7D3222' : '#1A1D2411',
                    color: isLive ? C.timeRed : isFT ? '#2E7D32' : '#555',
                  }}>
                    {isLive ? (f.elapsed ? `LIVE • ${f.elapsed}'` : 'LIVE') : isFT ? 'FT' : f.kickoffTime || 'Soon'}
                  </span>
                </div>

                {/* Teams */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <div style={{ flex:1, textAlign:'center' }}>
                    <TeamLogo src={f.homeLogo} size={52} circle />
                    <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:'#0F1218', lineHeight:1.3 }}>{f.homeName}</div>
                  </div>
                  <div style={{ textAlign:'center', padding:'0 8px' }}>
                    {isLive || isFT
                      ? <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color: isLive ? C.timeRed : '#0F1218' }}>
                          {f.homeScore} – {f.awayScore}
                        </span>
                      : !isUnlocked
                        ? <div style={{ textAlign:'center' }}>
                            <span style={{ fontSize:22 }}>🔒</span>
                            <div style={{ fontSize:14, color:'#9E9E9E', fontWeight:700 }}>vs</div>
                          </div>
                        : <span style={{ fontSize:16, fontWeight:700, color:'#0F1218' }}>vs</span>
                    }
                  </div>
                  <div style={{ flex:1, textAlign:'center' }}>
                    <TeamLogo src={f.awayLogo} size={52} circle />
                    <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:'#0F1218', lineHeight:1.3 }}>{f.awayName}</div>
                  </div>
                </div>

                {/* Tip row — shown when unlocked and NS */}
                {isUnlocked && f.status === 'NS' && (
                  <>
                    <div style={{ borderTop:'1px solid #E0E0E0', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{fontSize:13}}>💡</span>
                        <span style={{ fontSize:12, color:'#555' }}>Tip: </span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#0F1218' }}>{tip}</span>
                      </div>
                      <span style={{ background:C.scoresGreen, color:'#000', fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20 }}>
                        {conf}%
                      </span>
                    </div>
                  </>
                )}

                {/* Result row — shown when finished */}
                {isFT && isUnlocked && (
                  <div style={{ borderTop:'1px solid #E0E0E0', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{fontSize:13}}>{won ? '✅' : '❌'}</span>
                      <span style={{ fontSize:12, color:'#555' }}>Tip: </span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#0F1218' }}>{tip}</span>
                    </div>
                    <span style={{
                      background: won ? '#2E7D32' : C.timeRed + '22',
                      color: won ? '#fff' : C.timeRed,
                      fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20,
                    }}>{won ? 'WON ✓' : 'LOST ✗'}</span>
                  </div>
                )}
              </div>
              {(i + 1) % 3 === 0 && <AdUnit client={adsense.adsense_client} slot={adsense.adsense_slot} />}
            </div>
          )
        })}
      </div>

      {/* Lock card */}
      {!isUnlocked && fixtures.length > 0 && (
        <div style={{
          marginTop:14, background:'#1A2A1A', borderRadius:14, padding:20,
          textAlign:'center', border:`1px solid ${C.scoresGreen}33`,
        }}>
          <span style={{fontSize:36}}>🔒</span>
          <div style={{ marginTop:10, fontWeight:700, fontSize:16, color:'#fff' }}>Tips are locked</div>
          <div style={{ color:C.muted, fontSize:13, margin:'6px 0 14px' }}>Watch a short ad to unlock all 6 tips for free</div>
          <button onClick={onUnlock} style={{
            background:C.scoresGreen, color:'#000', border:'none',
            borderRadius:10, padding:'11px 24px', fontWeight:800, fontSize:14,
            display:'inline-flex', alignItems:'center', gap:8,
          }}>
            🔓 Watch Ad to Unlock
          </button>
        </div>
      )}
    </div>
  )
}

// ─── VIP TAB ─────────────────────────────────────────────────────────────────
function VipTab({ packages, vipTips, vipReady, lastBuy, onPurchase }: {
  packages: Package[]
  vipTips: Record<string, MatchPrediction[] | JackpotData>
  vipReady: boolean
  lastBuy: string | null
  onPurchase: (pkgId: string, duration: string, amount: number, label: string) => void
}) {
  const [selected, setSelected] = useState<Record<string, { duration: string; amount: number }>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const order = ['premium','basic','draws','correct','jackpot']
  const sorted = [...packages].sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id))

  const tipSections: [string, string][] = [
    ['premium','💎 Premium Tips'], ['basic','⚽ Basic Tips'],
    ['draws','🤝 Draw Tips'], ['correct','🎯 Correct Score'],
    ['sportpesa','🏆 SportPesa Jackpot'], ['mega','🏆 SportPesa MegaJackpot'],
    ['betika','🏆 Betika Jackpot'],
  ]

  return (
    <div style={{ padding: '0 0 120px' }}>
      {lastBuy && (
        <div style={{
          margin:16, background:'#0A1E10', border:`1px solid ${C.scoresGreen}`,
          borderRadius:12, padding:'14px 16px', display:'flex', gap:12, alignItems:'center',
        }}>
          <span style={{fontSize:26}}>🎉</span>
          <div>
            <div style={{ color:C.scoresGreen, fontWeight:700 }}>Payment successful!</div>
            <div style={{ color:C.muted, fontSize:12 }}>
              You now have access to <strong style={{color:'#fff'}}>{lastBuy.toUpperCase()}</strong> tips.
            </div>
          </div>
        </div>
      )}

      {anyAccess() && (
        <div style={{
          margin:16, background:'#0A2010', border:`1px solid ${C.scoresGreen}`,
          borderRadius:12, padding:'14px 16px', display:'flex', gap:12, alignItems:'center',
        }}>
          <span style={{fontSize:26}}>🔓</span>
          <div>
            <div style={{ color:C.scoresGreen, fontWeight:700, fontSize:15 }}>VIP Access Active</div>
            <div style={{ color:C.muted, fontSize:12 }}>Your tips are unlocked below each package.</div>
          </div>
        </div>
      )}

      <div style={{ padding:'0 16px' }}>
        <SectionTitle><span>💎</span> VIP Packages</SectionTitle>
      </div>

      {packages.length === 0 && <EmptyState icon="💎" text="Loading packages..." />}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16, padding:'0 16px' }}>
        {sorted.filter(p => p.id !== 'free').map(pkg => {
          const prices  = pkg.price.prices ?? []
          const jackpots= pkg.price.jackpots ?? []
          const isJp    = pkg.id === 'jackpot'
          const acc     = isJp
            ? (hasAccess('sportpesa') || hasAccess('mega') || hasAccess('betika'))
            : hasAccess(pkg.id)
          const sel = selected[pkg.id]
          const dlabel: Record<string,string> = { DAILY:'Daily', WEEKLY:'Weekly', MONTHLY:'Monthly' }

          return (
            <div key={pkg.id} style={{
              background: pkg.isMostPopular
                ? 'linear-gradient(135deg,#0B1E13,#0F1520)'
                : C.darkCard,
              border: `1px solid ${pkg.isMostPopular ? C.scoresGreen : C.darkCardHover}`,
              borderRadius: 16, padding: 22, position: 'relative',
              display:'flex', flexDirection:'column',
              transition:'transform 0.2s',
            }}>
              {pkg.isMostPopular && (
                <div style={{
                  position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)',
                  background:C.scoresGreen, color:'#000',
                  fontSize:11, fontWeight:800, padding:'3px 14px', borderRadius:20,
                  whiteSpace:'nowrap', letterSpacing:0.5,
                }}>⭐ MOST POPULAR</div>
              )}
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:2 }}>{pkg.title}</div>
              <div style={{ color:C.muted, fontSize:12, marginBottom:12 }}>{pkg.subtitle}</div>

              {acc
                ? <div style={{ background:C.scoresGreen+'22', borderRadius:8, padding:'7px 12px', textAlign:'center', marginBottom:12, color:C.scoresGreen, fontSize:12, fontWeight:700 }}>✓ Active — tips unlocked below</div>
                : <div style={{ background:'rgba(0,0,0,0.3)', border:`1px dashed ${C.darkCardHover}`, borderRadius:8, padding:'9px 12px', textAlign:'center', marginBottom:12, color:C.muted, fontSize:12 }}>🔒 Select a plan to purchase</div>
              }

              {prices.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                  {prices.map(p => (
                    <div key={p.duration} onClick={() => setSelected(prev => ({...prev, [pkg.id]: {duration:p.duration, amount:p.amount}}))}
                      style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        background: C.darkBackground, borderRadius:8, padding:'8px 12px',
                        cursor:'pointer',
                        border:`1.5px solid ${sel?.duration===p.duration ? C.scoresGreen : 'transparent'}`,
                        background: sel?.duration===p.duration ? '#0A1A0A' : C.darkBackground,
                      }}>
                      <span style={{ color:C.muted, fontSize:12, fontWeight:600 }}>{dlabel[p.duration] ?? p.duration}</span>
                      <span style={{ color:C.scoresGreen, fontWeight:700, fontSize:14 }}>${p.amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {jackpots.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                  {jackpots.map(j => {
                    const bkId = j.bookmaker.toLowerCase().includes('mega') ? 'mega'
                      : j.bookmaker.toLowerCase().includes('betika') ? 'betika' : 'sportpesa'
                    return (
                      <div key={j.bookmaker} onClick={() => setSelected(prev => ({...prev, [bkId]: {duration:'DAILY', amount:j.amount}}))}
                        style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          background: selected[bkId] ? '#1A1200' : C.darkBackground,
                          borderRadius:8, padding:'8px 12px', cursor:'pointer',
                          border:`1.5px solid ${selected[bkId] ? C.goldColor : 'transparent'}`,
                        }}>
                        <span style={{ color:C.muted, fontSize:12 }}>{j.bookmaker}</span>
                        <span style={{ color:C.goldColor, fontWeight:700, fontSize:13 }}>${j.amount}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:5, marginBottom:16, flex:1 }}>
                {pkg.features.map((f,i) => (
                  <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:7, fontSize:12, color:C.muted, lineHeight:1.4 }}>
                    <span style={{ color:C.scoresGreen, fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              {acc ? (
                <button onClick={() => setExpanded(e => ({...e, [pkg.id]: !e[pkg.id]}))} style={{
                  background:'linear-gradient(90deg,#00b248,#00C853)',
                  color:'#000', border:'none', borderRadius:10, padding:11,
                  fontWeight:800, fontSize:13, cursor:'pointer',
                }}>📋 {expanded[pkg.id] ? 'Hide' : 'View'} Today's Tips</button>
              ) : (
                <button onClick={() => {
                  const s = isJp
                    ? Object.keys(selected).find(k => ['sportpesa','mega','betika'].includes(k))
                    : pkg.id
                  if (!s && !sel) { alert('Please select a plan first'); return }
                  const pkgId    = isJp ? (s ?? 'sportpesa') : pkg.id
                  const duration = isJp ? 'DAILY' : (sel?.duration ?? 'WEEKLY')
                  const amount   = isJp ? (selected[pkgId]?.amount ?? jackpots[0]?.amount ?? 0) : (sel?.amount ?? 0)
                  onPurchase(pkgId, duration, amount, `${pkg.title} — ${dlabel[duration] ?? duration}`)
                }} style={{
                  width:'100%',
                  background: pkg.isMostPopular ? C.scoresGreen : 'transparent',
                  color: pkg.isMostPopular ? '#000' : C.scoresGreen,
                  border: pkg.isMostPopular ? 'none' : `1.5px solid ${C.scoresGreen}`,
                  borderRadius:10, padding:11, fontWeight:800, fontSize:13, cursor:'pointer',
                }}>Get Access →</button>
              )}

              {/* Inline expanded tips */}
              {acc && expanded[pkg.id] && (
                <div style={{ marginTop:12, borderTop:`1px solid ${C.darkCardHover}`, paddingTop:12 }}>
                  {isJp ? (
                    ['sportpesa','mega','betika'].filter(hasAccess).map(bkId => {
                      const data = vipTips[bkId] as JackpotData | undefined
                      const bkColors: Record<string,string> = { sportpesa:'#00704A', mega:C.timeRed, betika:'#1565C0' }
                      const bkNames: Record<string,string>  = { sportpesa:'SportPesa Jackpot', mega:'SportPesa MegaJackpot', betika:'Betika Grand Jackpot' }
                      return (
                        <div key={bkId} style={{ marginBottom:12 }}>
                          <div style={{
                            display:'flex', alignItems:'center', gap:8,
                            background: bkColors[bkId]+'22', borderRadius:8, padding:'8px 12px', marginBottom:8,
                          }}>
                            <span style={{ color:bkColors[bkId], fontWeight:700, fontSize:13 }}>{bkNames[bkId]}</span>
                            {data?.jackpotAmount && <span style={{ color:C.goldColor, fontSize:12, marginLeft:'auto' }}>{data.jackpotAmount}</span>}
                          </div>
                          {data?.matches.map((m,i) => (
                            <div key={i} style={{
                              display:'flex', alignItems:'center', gap:8,
                              padding:'8px 4px', borderBottom:`1px solid ${C.darkCardHover}22`,
                            }}>
                              <div style={{ width:22, height:22, borderRadius:'50%', background:bkColors[bkId]+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <span style={{ color:bkColors[bkId], fontSize:10, fontWeight:700 }}>{i+1}</span>
                              </div>
                              <TeamLogo src={m.iconA} size={18} />
                              <span style={{ flex:1, fontSize:11, fontWeight:600 }}>{m.teamA}</span>
                              <span style={{ color:C.muted, fontSize:10 }}>vs</span>
                              <span style={{ flex:1, fontSize:11, fontWeight:600, textAlign:'right' }}>{m.teamB}</span>
                              <TeamLogo src={m.iconB} size={18} />
                              <span style={{ background:bkColors[bkId], color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, flexShrink:0 }}>{m.tip}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })
                  ) : (
                    <VipTipsList tips={vipTips[pkg.id] as MatchPrediction[] | undefined} ready={vipReady} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Separate expanded tip sections */}
      {anyAccess() && (
        <div style={{ marginTop:32, padding:'0 16px' }}>
          <SectionTitle><span>📋</span> Today's VIP Tips</SectionTitle>
          {tipSections.map(([id, label]) => {
            if (!hasAccess(id)) return null
            const data = vipTips[id]
            return (
              <div key={id} style={{ marginBottom:28 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${C.darkCardHover}`, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1 }}>{label}</span>
                  <Chip>Active</Chip>
                  <span style={{ color:C.muted, fontSize:11, marginLeft:'auto' }}>Expires {expiryLabel(id)}</span>
                </div>
                {['sportpesa','mega','betika'].includes(id)
                  ? <JackpotList data={data as JackpotData | undefined} id={id} />
                  : <VipTipsList tips={data as MatchPrediction[] | undefined} ready={vipReady} />
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VipTipsList({ tips, ready }: { tips?: MatchPrediction[]; ready: boolean }) {
  if (!ready || !tips) return <div style={{ padding:'20px 0', textAlign:'center' }}><Spinner /></div>
  if (tips.length === 0) return <EmptyState icon="⚽" text="No fixtures today — check back soon." />
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:10 }}>
      {tips.map((t,i) => {
        const tA = typeof (t as any).teamA === 'object' ? (t as any).teamA?.name ?? '' : t.teamA
        const tB = typeof (t as any).teamB === 'object' ? (t as any).teamB?.name ?? '' : t.teamB
        const iA = typeof (t as any).iconA === 'object' ? (t as any).iconA?.icon ?? '' : t.iconA
        const iB = typeof (t as any).iconB === 'object' ? (t as any).iconB?.icon ?? '' : t.iconB
        return (
          <div key={i} style={{ background:C.darkCard, border:`1px solid ${C.darkCardHover}`, borderRadius:10, padding:13 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:9, gap:8 }}>
              <span style={{ color:C.muted, fontSize:11, fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.league}</span>
              <span style={{ color:C.scoresGreen, fontSize:11, fontWeight:700, flexShrink:0 }}>{t.kickOff}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
                <TeamLogo src={iA} size={22} />
                <span style={{ fontSize:12, fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tA}</span>
              </div>
              <span style={{ color:C.muted, fontSize:11, fontWeight:700, flexShrink:0 }}>VS</span>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:6, flexDirection:'row-reverse' }}>
                <TeamLogo src={iB} size={22} />
                <span style={{ fontSize:12, fontWeight:600, textAlign:'right', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tB}</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:`1px solid ${C.darkCardHover}` }}>
              <span style={{ background:C.scoresGreen+'22', color:C.scoresGreen, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>
                💡 {t.tip}
              </span>
              {t.odds && <span style={{ color:C.muted, fontSize:11 }}>@{t.odds}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function JackpotList({ data, id }: { data?: JackpotData; id: string }) {
  const colors: Record<string,string> = { sportpesa:'#00704A', mega:C.timeRed, betika:'#1565C0' }
  const c = colors[id] ?? C.scoresGreen
  if (!data) return <div style={{ padding:'20px 0', textAlign:'center' }}><Spinner /></div>
  return (
    <>
      {data.jackpotAmount && (
        <div style={{ background:`linear-gradient(90deg,${C.goldColor}11,${C.goldColor}05)`, border:`1px solid ${C.goldColor}44`, borderRadius:10, padding:'12px 16px', marginBottom:14, color:C.goldColor, fontWeight:700, textAlign:'center' }}>
          🏆 {data.bookmaker} — Prize: {data.jackpotAmount}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:10 }}>
        {data.matches.map((m,i) => (
          <div key={i} style={{ background:C.darkCard, border:`1px solid ${C.darkCardHover}`, borderRadius:10, padding:13 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:9, gap:8 }}>
              <span style={{ color:C.muted, fontSize:11, fontWeight:600 }}>{m.league}</span>
              <span style={{ color:C.scoresGreen, fontSize:11, fontWeight:700 }}>{m.kickOff}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>
                <TeamLogo src={m.iconA} size={22} />
                <span style={{ fontSize:12, fontWeight:600, flex:1 }}>{m.teamA}</span>
              </div>
              <span style={{ color:C.muted, fontSize:11, fontWeight:700 }}>VS</span>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:6, flexDirection:'row-reverse' }}>
                <TeamLogo src={m.iconB} size={22} />
                <span style={{ fontSize:12, fontWeight:600, textAlign:'right', flex:1 }}>{m.teamB}</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:`1px solid ${C.darkCardHover}` }}>
              <span style={{ background:c, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:5 }}>{m.tip}</span>
              <span style={{ color:C.muted, fontSize:11 }}>@{m.odds}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
function HistoryTab({ history, loading, onRetry }: { history: HistoryBatch[]; loading: boolean; onRetry: () => void }) {
  const CAT_ORDER = ['Premium Tips','Daily Correct Score','Draw Tips','Basic Tips','Free Tips']
  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={36} /></div>
  if (history.length === 0) return <EmptyState icon="🏆" text="No history available yet." onRetry={onRetry} />

  return (
    <div style={{ padding:'16px 16px 120px' }}>
      <SectionTitle>
        <span style={{ color:C.goldColor }}>🏆</span> Winning Tips History
      </SectionTitle>
      {history.map((batch, bi) => {
        const total = Object.values(batch.categories).reduce((s,v) => s+v.length, 0)
        return (
          <div key={bi} style={{ marginBottom:24 }}>
            {/* Day pill */}
            <div style={{ textAlign:'center', marginBottom:12 }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:10,
                background:C.darkCardHover, borderRadius:30, padding:'6px 20px',
                fontWeight:700, fontSize:13,
              }}>
                📅 {batch.date}
                <span style={{ background:C.scoresGreen+'22', color:C.scoresGreen, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                  {total} Tips
                </span>
              </div>
            </div>

            {CAT_ORDER.map(cat => {
              const matches = batch.categories[cat]
              if (!matches?.length) return null
              const catColor = CATEGORY_COLORS[cat] ?? C.scoresGreen
              return (
                <div key={cat}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 0 6px' }}>
                    <span style={{ background:catColor+'22', color:catColor, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>{cat}</span>
                    <span style={{ background:catColor+'11', color:catColor, fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:20 }}>{matches.length} wins</span>
                  </div>
                  {matches.map((m, mi) => (
                    <div key={mi} style={{
                      background:C.darkCard, borderRadius:14, padding:14, marginBottom:8,
                      boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
                    }}>
                      {/* Teams + score */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
                          <TeamLogo src={m.homeLogo} size={30} />
                          <span style={{ fontWeight:700, fontSize:13, flex:1 }}>{m.teamA}</span>
                        </div>
                        <div style={{ textAlign:'center', padding:'0 10px' }}>
                          <div style={{ color:catColor, fontWeight:800, fontSize:16 }}>{m.score}</div>
                          <div style={{ color:C.muted, fontSize:10 }}>FT</div>
                        </div>
                        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, flexDirection:'row-reverse' }}>
                          <TeamLogo src={m.awayLogo} size={30} />
                          <span style={{ fontWeight:700, fontSize:13, textAlign:'right', flex:1 }}>{m.teamB}</span>
                        </div>
                      </div>
                      <div style={{ borderTop:`1px solid ${C.darkCardHover}`, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ color:C.muted, fontSize:10 }}>Prediction</div>
                          <div style={{ fontWeight:700, fontSize:12 }}>{m.prediction}</div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ color:C.muted, fontSize:10 }}>Odds</div>
                          <span style={{ background:catColor+'22', color:catColor, fontWeight:800, fontSize:13, padding:'2px 8px', borderRadius:6 }}>{m.odds}</span>
                        </div>
                        <div style={{ background:'#1B4332', borderRadius:20, padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{fontSize:12}}>✅</span>
                          <span style={{ color:C.scoresGreen, fontWeight:800, fontSize:11 }}>WON ✓</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── SUPPORT TAB ──────────────────────────────────────────────────────────────
function SupportTab({ support }: { support: SupportConfig }) {
  const socials = [
    { id:'yt',  href:SOCIAL.youtube,   icon:'▶', label:'YouTube',   handle:'@victonicsports', color:'#FF0000' },
    { id:'tt',  href:SOCIAL.tiktok,    icon:'♪', label:'TikTok',    handle:'@victonicsports', color:'#69c9d0' },
    { id:'ig',  href:SOCIAL.instagram, icon:'◈', label:'Instagram', handle:'@victonicsports_', color:'#E1306C' },
    { id:'fb',  href:SOCIAL.facebook,  icon:'f', label:'Facebook',  handle:'Victonic Sports', color:'#1877F2' },
  ]
  return (
    <div style={{ padding:'16px 16px 120px' }}>
      {/* Telegram CTA */}
      {support.telegram && (
        <div style={{ background:'#0F2B3D', borderRadius:14, padding:'14px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:14, border:'1px solid #0088CC33' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'#0088CC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{fontSize:22}}>✈️</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Join Telegram</div>
            <div style={{ color:C.muted, fontSize:12 }}>Real-time tips & updates</div>
          </div>
          <a href={support.telegram} target="_blank" rel="noopener noreferrer" style={{
            background:'#0088CC', color:'#fff', border:'none', borderRadius:8,
            padding:'8px 16px', fontWeight:800, fontSize:13, flexShrink:0,
          }}>JOIN</a>
        </div>
      )}

      {/* Contact */}
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:C.scoresGreen, letterSpacing:1, marginBottom:10, padding:'0 2px' }}>CONTACT SUPPORT</div>
      <div style={{ background:C.darkCard, borderRadius:14, overflow:'hidden', marginBottom:24, border:`1px solid ${C.darkCardHover}` }}>
        {support.whatsapp && (
          <a href={support.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderBottom:`1px solid ${C.darkCardHover}` }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'#1A3A2722', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#25D366', fontSize:20 }}>💬</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>WhatsApp</div>
              <div style={{ color:C.muted, fontSize:12 }}>Chat with our support team</div>
            </div>
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </a>
        )}
        {support.email && (
          <a href={`mailto:${support.email}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px' }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'#3A1A1A22', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#EA4335', fontSize:20 }}>📧</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>Email Support</div>
              <div style={{ color:C.muted, fontSize:12 }}>{support.email}</div>
            </div>
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </a>
        )}
      </div>

      {/* App experience */}
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:C.scoresGreen, letterSpacing:1, marginBottom:10, padding:'0 2px' }}>APP EXPERIENCE</div>
      <div style={{ background:C.darkCard, borderRadius:14, overflow:'hidden', marginBottom:24, border:`1px solid ${C.darkCardHover}` }}>
        {[
          { icon:'🔗', bg:'#1B4332', color:C.scoresGreen, title:'Share with Friends', sub:'Invite others to get winning tips', onClick:() => navigator.share?.({ text:'Check out AJ Tips!' }) },
          { icon:'⭐', bg:'#1B4332', color:C.scoresGreen, title:'Rate Us', sub:'Support us on Play Store', onClick:() => window.open('https://play.google.com/store') },
        ].map((r,i,arr) => (
          <button key={i} onClick={r.onClick} style={{
            width:'100%', background:'none', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
            borderBottom: i < arr.length-1 ? `1px solid ${C.darkCardHover}` : 'none',
          }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{r.icon}</div>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>{r.title}</div>
              <div style={{ color:C.muted, fontSize:12 }}>{r.sub}</div>
            </div>
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </button>
        ))}
      </div>

      {/* Social */}
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:C.scoresGreen, letterSpacing:1, marginBottom:10, padding:'0 2px' }}>STAY CONNECTED</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
        {socials.map(s => (
          <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" style={{
            background:C.darkCard, border:`1px solid ${C.darkCardHover}`,
            borderRadius:12, padding:'14px 12px',
            display:'flex', alignItems:'center', gap:10,
            transition:'border-color 0.2s',
          }}>
            <div style={{ width:42, height:42, borderRadius:10, background:s.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:s.color, flexShrink:0, fontWeight:700 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>{s.label}</div>
              <div style={{ color:C.muted, fontSize:11 }}>{s.handle}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Legal */}
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:C.scoresGreen, letterSpacing:1, marginBottom:10, padding:'0 2px' }}>LEGAL & SUPPORT</div>
      <div style={{ background:C.darkCard, borderRadius:14, overflow:'hidden', marginBottom:24, border:`1px solid ${C.darkCardHover}` }}>
        {['Privacy Policy','Terms of Service'].map((t,i,arr) => (
          <button key={t} style={{
            width:'100%', background:'none', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
            borderBottom: i < arr.length-1 ? `1px solid ${C.darkCardHover}` : 'none',
          }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'#1B3A1B', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:C.scoresGreen }}>🛡️</span>
            </div>
            <span style={{ flex:1, fontWeight:700, fontSize:15, color:'#fff', textAlign:'left' }}>{t}</span>
            <span style={{ color:C.muted, fontSize:18 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ textAlign:'center', color:C.muted, fontSize:11, lineHeight:1.6 }}>
        <div style={{ display:'inline-block', background:C.darkCard, borderRadius:20, padding:'4px 16px', marginBottom:10 }}>v2.0.0</div>
        <br />© 2026 AJ Tips · Victonic Sports. All rights reserved.
        <br />Predictions are for entertainment purposes only.
      </div>
    </div>
  )
}

// ─── PAY MODAL ────────────────────────────────────────────────────────────────
function PayModal({ pkgId, duration, amount, label, onSuccess, onClose }: {
  pkgId: string; duration: string; amount: number; label: string
  onSuccess: (pkgId: string, duration: string) => void
  onClose: () => void
}) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const pay = () => {
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return }
    setLoading(true)
    try {
      openPaystack({
        email, amount: Math.round(amount * 100), currency: 'KES',
        ref: genRef(pkgId), pkgId, duration,
        onSuccess: () => { setLoading(false); onSuccess(pkgId, duration) },
        onClose: () => setLoading(false),
      })
    } catch { setLoading(false); setError('Could not connect to Paystack. Please try again.') }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div style={{
        background:C.darkCard, border:`1px solid ${C.darkCardHover}`,
        borderRadius:16, padding:'28px 24px', width:'100%', maxWidth:420, position:'relative',
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:14, right:16, background:'none', border:'none',
          color:C.muted, fontSize:22, cursor:'pointer',
        }}>✕</button>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:4 }}>Get VIP Access</div>
        <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>{label}</div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:'block', marginBottom:5 }}>Email Address</label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pay()}
            placeholder="you@example.com"
            style={{
              width:'100%', background:'#080b10', border:`1.5px solid ${C.darkCardHover}`,
              borderRadius:9, padding:'10px 13px', color:'#fff', fontSize:13,
              fontFamily:'inherit', outline:'none',
            }}
          />
        </div>
        <div style={{
          background:'#080b10', borderRadius:9, padding:'12px 14px', marginBottom:18,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div style={{ color:C.muted, fontSize:12 }}>{label}</div>
          <div style={{ color:C.scoresGreen, fontWeight:700, fontSize:15 }}>${amount}</div>
        </div>
        <button onClick={pay} disabled={loading} style={{
          width:'100%', background:C.scoresGreen, color:'#000', border:'none',
          borderRadius:10, padding:13, fontWeight:800, fontSize:14, cursor:'pointer',
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Connecting...' : 'Pay with Paystack 🔒'}
        </button>
        {error && <div style={{ color:C.timeRed, fontSize:12, marginTop:8 }}>{error}</div>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:C.muted, fontSize:11, marginTop:12 }}>
          <div style={{ width:12, height:12, borderRadius:'50%', background:'#00c3f7' }}/>
          Secured by Paystack
        </div>
      </div>
    </div>
  )
}

// ─── EXIT DIALOG ──────────────────────────────────────────────────────────────
function ExitDialog({ onCancel, onExit }: { onCancel: () => void; onExit: () => void }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div style={{ background:C.darkCard, borderRadius:16, padding:24, maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚽</div>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Exit AJ Tips?</div>
        <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>You'll miss today's winning tips!</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{
            flex:1, background:C.darkCardHover, color:'#fff',
            border:'none', borderRadius:10, padding:11, fontWeight:700, cursor:'pointer',
          }}>Stay</button>
          <button onClick={onExit} style={{
            flex:1, background:C.timeRed, color:'#fff',
            border:'none', borderRadius:10, padding:11, fontWeight:700, cursor:'pointer',
          }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App({ initialFixtures, support, testMode }: {
  initialFixtures: Fixture[]
  support: SupportConfig
  testMode: boolean
}) {
  const [splashDone, setSplashDone] = useState(false)
  const [isOnline,   setIsOnline]   = useState(true)
  const [tab,        setTab]        = useState<Tab>('live')
  const [headerVis,  setHeaderVis]  = useState(true)
  const [exitDlg,    setExitDlg]    = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [lastBuy,    setLastBuy]    = useState<string | null>(null)
  const [vipAccess,  setVipAccess]  = useState(false)

  const [fixtures,   setFixtures]   = useState(initialFixtures)
  const [liveLoading,setLiveLoading]= useState(false)
  const [packages,   setPackages]   = useState<Package[]>([])
  const [history,    setHistory]    = useState<HistoryBatch[]>([])
  const [histLoad,   setHistLoad]   = useState(false)
  const [vipTips,    setVipTips]    = useState<Record<string, MatchPrediction[] | JackpotData>>({})
  const [vipReady,   setVipReady]   = useState(false)
  const [scoresCache,setScoresCache]= useState<Map<string, Fixture[]>>(new Map([[getOffsetDate(0), initialFixtures]]))

  // Payment modal
  const [payModal,   setPayModal]   = useState(false)
  const [payPkg,     setPayPkg]     = useState({ id:'', duration:'WEEKLY', amount:0, label:'' })

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastY     = useRef(0)

  // Splash
  useEffect(() => { const t = setTimeout(() => setSplashDone(true), 2000); return () => clearTimeout(t) }, [])

  // Online
  useEffect(() => {
    const up = () => setIsOnline(true); const dn = () => setIsOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', dn)
    setIsOnline(navigator.onLine)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  // VIP access
  useEffect(() => { setVipAccess(anyAccess()) }, [lastBuy])

  // Load AdSense
  useEffect(() => {
    if (!support.adsense_client) return
    if (document.getElementById('adsense-script')) return
    const s = document.createElement('script')
    s.id = 'adsense-script'
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${support.adsense_client}`
    s.async = true; s.crossOrigin = 'anonymous'
    document.head.appendChild(s)
  }, [support.adsense_client])

  // Auto-refresh live every 60s
  useEffect(() => {
    if (tab !== 'live') return
    const id = setInterval(() => {
      setLiveLoading(true)
      fetchFixtures(getOffsetDate(0)).then(data => {
        setFixtures(data)
        setScoresCache(prev => new Map(prev).set(getOffsetDate(0), data))
        setLiveLoading(false)
      })
    }, 60000)
    return () => clearInterval(id)
  }, [tab])

  // Load packages
  useEffect(() => {
    if (tab === 'vip' && packages.length === 0)
      loadPackages().then(p => p && setPackages(p))
  }, [tab])

  // Load history
  useEffect(() => {
    if (tab === 'history' && history.length === 0) {
      setHistLoad(true)
      loadHistory().then(h => { h && setHistory(h); setHistLoad(false) })
    }
  }, [tab])

  // Load VIP tips
  useEffect(() => {
    if (tab !== 'vip' || !vipAccess) return
    const loaders: Record<string, () => Promise<any>> = {
      premium: loadPremiumTips, basic: loadBasicTips,
      draws: loadDrawsTips, correct: loadCorrectTips,
      sportpesa: loadJackpotSP, mega: loadJackpotMega, betika: loadJackpotBet,
    }
    const toLoad = Object.keys(loaders).filter(id => hasAccess(id) && !vipTips[id])
    if (!toLoad.length) { setVipReady(true); return }
    Promise.all(toLoad.map(id => loaders[id]().then(data => [id, data] as [string, any])))
      .then(results => {
        setVipTips(prev => {
          const next = { ...prev }
          results.forEach(([id, data]) => { if (data) next[id] = data })
          return next
        })
        setVipReady(true)
      })
  }, [tab, vipAccess])

  // Scroll hide header
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop
    if (y < 10) { setHeaderVis(true); lastY.current = y; return }
    setHeaderVis(y < lastY.current)
    lastY.current = y
  }, [])

  // Back handler (exit dialog)
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (tab !== 'live') { setTab('live'); window.history.pushState(null,'',''); return }
      setExitDlg(true)
    }
    window.history.pushState(null, '', '')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [tab])

  const liveCount = fixtures.filter(f => LIVE_STATUSES.includes(f.status)).length
  const freePicks = pickFreeFixtures(fixtures)

  if (!splashDone) return <SplashScreen />
  if (!isOnline)   return <NoInternet />
  if (testMode)    return <Maintenance />

  return (
    <div style={{ background: C.darkBackground, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {support.showFullContent !== false && <Header visible={headerVis} />}

      <div ref={scrollRef} onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>
        <div key={tab} className="fade">
          {tab === 'live'    && <LiveTab fixtures={fixtures} loading={liveLoading} adsense={support} />}
          {tab === 'scores'  && <ScoresTab allFixtures={scoresCache} adsense={support} />}
          {tab === 'free'    && <FreeTab fixtures={freePicks} isUnlocked={isUnlocked} onUnlock={() => setIsUnlocked(true)} adsense={support} />}
          {tab === 'vip'     && <VipTab packages={packages} vipTips={vipTips} vipReady={vipReady} lastBuy={lastBuy} onPurchase={(id,dur,amt,lbl) => { setPayPkg({id,duration:dur,amount:amt,label:lbl}); setPayModal(true) }} />}
          {tab === 'history' && <HistoryTab history={history} loading={histLoad} onRetry={() => { setHistory([]); setHistLoad(true); loadHistory().then(h => { h && setHistory(h); setHistLoad(false) }) }} />}
          {tab === 'support' && <SupportTab support={support} />}
        </div>
      </div>

      <BottomNav tab={tab} setTab={setTab} liveCount={liveCount} vipAccess={vipAccess} />

      {payModal && (
        <PayModal
          pkgId={payPkg.id} duration={payPkg.duration}
          amount={payPkg.amount} label={payPkg.label}
          onSuccess={(id, dur) => {
            grantAccess(id, durationDays(dur))
            setLastBuy(id); setPayModal(false); setTab('vip')
          }}
          onClose={() => setPayModal(false)}
        />
      )}

      {exitDlg && <ExitDialog onCancel={() => setExitDlg(false)} onExit={() => window.history.go(-2)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fade { animation: fadeIn 0.25s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        * { -webkit-tap-highlight-color: transparent; }
        input:focus { border-color: ${C.scoresGreen} !important; }
      `}</style>
    </div>
  )
}
