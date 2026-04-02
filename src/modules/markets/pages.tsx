import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ForecastChart, PriceChart } from '../../components/charts/analytics'
import { NewsCard, NoteCard } from '../../components/domain/cards'
import { ActionLink, Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/api'
import { pairNarrative } from '../../domain/selectors'
import type { Pair, PriceSeries, TechnicalSnapshot } from '../../domain/types'
import { cn, formatDateTime, formatNumber, formatPercent, title } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

const getSeriesMove = (series?: PriceSeries) => {
  const last = series?.points.at(-1)?.value ?? 0
  const prev = series?.points.at(-2)?.value ?? last
  const first = series?.points.at(0)?.value ?? last
  const delta = last - prev
  const percent = first ? ((last - first) / first) * 100 : 0
  return { last, delta, percent }
}

const riskTone = (risk: number) => {
  if (risk >= 82) return 'danger'
  if (risk >= 65) return 'warning'
  return 'accent'
}

const trendTone = (trend: TechnicalSnapshot['trend']) => {
  if (trend === 'bullish') return 'up'
  if (trend === 'bearish') return 'down'
  return 'flat'
}

const volatilityLabel = (score: number) => {
  if (score >= 75) return 'high'
  if (score >= 55) return 'elevated'
  return 'contained'
}

const moveLabel = (percent: number) => {
  if (percent > 0.45) return 'bullish'
  if (percent < -0.45) return 'bearish'
  return 'neutral'
}

const driverLeader = (weights: TechnicalSnapshot['driverWeights']) =>
  Object.entries(weights).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'macro'

const DriverBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
      <span>{label}</span>
      <span>{formatNumber(value, 0)}</span>
    </div>
    <div className="h-1.5 bg-[color:var(--panel-4)]">
      <div className="h-full bg-[linear-gradient(90deg,var(--accent),rgba(112,216,200,0.15))]" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  </div>
)

const ViewToggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    className={cn(
      'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition',
      active ? 'bg-[var(--accent)] text-[#003731]' : 'bg-[color:var(--panel-4)] text-[var(--muted)] hover:text-[var(--text)]',
    )}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
)

export const MarketsPage = () => {
  const navigate = useNavigate()
  const { user } = useAppState()
  const [searchQuery, setSearchQuery] = useState('')
  const [classificationFilter, setClassificationFilter] = useState<'all' | Pair['classification']>('all')
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'moderate' | 'lower'>('all')
  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M'>('1D')
  const [focusPairId, setFocusPairId] = useState<string | null>(null)
  const [watchedIds, setWatchedIds] = useState<string[]>([])
  const { data, loading } = useAsyncResource(() => appApi.listPairs(), [])
  const seed = getSeed()

  useEffect(() => {
    if (!user) {
      setWatchedIds([])
      return
    }
    setWatchedIds(
      seed.watchlist
        .filter((item) => item.userId === user.id && item.entityType === 'pair')
        .map((item) => item.entityId),
    )
  }, [user?.id, seed.watchlist])

  const enrichedPairs = useMemo(() => {
    if (!data) return []
    return data.map((pair) => {
      const daySeries = seed.priceSeries.find((item) => item.pairId === pair.id && item.timeframe === '1D')
      const weekSeries = seed.priceSeries.find((item) => item.pairId === pair.id && item.timeframe === '1W')
      const monthSeries = seed.priceSeries.find((item) => item.pairId === pair.id && item.timeframe === '1M')
      const technical = seed.technicals.find((item) => item.pairId === pair.id)!
      const forecast = seed.forecasts.find((item) => item.pairId === pair.id)!
      const current = getSeriesMove(daySeries ?? monthSeries)
      const weekMove = getSeriesMove(weekSeries)
      const monthMove = getSeriesMove(monthSeries)
      return {
        pair,
        technical,
        forecast,
        currentPrice: current.last,
        dailyDelta: current.delta,
        dailyDeltaPercent: weekMove.last ? (current.delta / weekMove.last) * 100 : 0,
        weekPercent: weekMove.percent,
        monthPercent: monthMove.percent,
        volatility: technical.volatilityScore,
        bias: moveLabel(monthMove.percent),
        uncertainty: Math.max(...forecast.uncertaintyCurve) * 100,
      }
    })
  }, [data, seed.forecasts, seed.priceSeries, seed.technicals])

  const currencyNameByCode = useMemo(
    () => Object.fromEntries(seed.currencies.map((currency) => [currency.code, currency.name])),
    [seed.currencies],
  )

  if (loading || !data) return <LoadingPanel label="Loading market explorer…" />

  const filteredPairs = enrichedPairs
    .filter((item) => (searchQuery ? item.pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || `${item.pair.baseCode}${item.pair.quoteCode}`.toLowerCase().includes(searchQuery.toLowerCase()) : true))
    .filter((item) => (classificationFilter === 'all' ? true : item.pair.classification === classificationFilter))
    .filter((item) => {
      if (riskFilter === 'all') return true
      if (riskFilter === 'high') return item.pair.eventRiskBase >= 80
      if (riskFilter === 'moderate') return item.pair.eventRiskBase >= 60 && item.pair.eventRiskBase < 80
      return item.pair.eventRiskBase < 60
    })

  const highRiskPairs = [...enrichedPairs].sort((a, b) => b.pair.eventRiskBase - a.pair.eventRiskBase)
  const watchedPairs = filteredPairs.filter((item) => watchedIds.includes(item.pair.id))
  const defaultHeroPair =
    filteredPairs.find((item) => item.pair.id === 'usd-jpy')
    ?? enrichedPairs.find((item) => item.pair.id === 'usd-jpy')
    ?? highRiskPairs[0]
    ?? filteredPairs[0]
  const topPriorityPair = filteredPairs.find((item) => item.pair.id === focusPairId) ?? defaultHeroPair
  const comparePairs = filteredPairs.filter((item) => item.pair.id !== topPriorityPair?.pair.id).slice(0, 3)
  const topPrioritySeries = topPriorityPair
    ? seed.priceSeries.find((item) => item.pairId === topPriorityPair.pair.id && item.timeframe === chartTimeframe)
      ?? seed.priceSeries.find((item) => item.pairId === topPriorityPair.pair.id && item.timeframe === '1D')
      ?? seed.priceSeries.find((item) => item.pairId === topPriorityPair.pair.id && item.timeframe === '1M')
    : null

  const toggleWatch = async (pairId: string) => {
    await appApi.toggleWatchlist('pair', pairId)
    setWatchedIds((current) => (current.includes(pairId) ? current.filter((item) => item !== pairId) : [...current, pairId]))
  }

  return (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Panel className="overflow-hidden p-0">
            <div className="bg-[color:var(--panel-2)] px-5 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Real-time feed</div>
                  <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">
                    {topPriorityPair ? `${topPriorityPair.pair.symbol} liquidity cluster` : 'Market terminal'}
                  </h2>
                </div>
                {topPriorityPair ? (
                  <div className="text-right">
                    <div className="font-display text-[2.35rem] font-semibold tracking-[-0.05em] text-[var(--accent)]">
                      {formatNumber(topPriorityPair.currentPrice, topPriorityPair.pair.displayPrecision)}
                    </div>
                    <div className={cn('font-mono text-[10px] uppercase tracking-[0.14em]', topPriorityPair.dailyDelta >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]')}>
                      {topPriorityPair.dailyDelta >= 0 ? '+' : ''}
                      {formatPercent(topPriorityPair.dailyDeltaPercent)}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Visible pairs" value={filteredPairs.length} />
                <Stat label="High event risk" value={filteredPairs.filter((item) => item.pair.eventRiskBase >= 80).length} />
                <Stat label="Watched pairs" value={watchedPairs.length} />
              </div>
              {topPrioritySeries ? (
                <div className="mt-5 bg-[color:var(--panel-4)] px-4 py-4">
                  <PriceChart chartMode="line" overlays={[]} series={topPrioritySeries} />
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">Risk Alerts</h3>
                <Badge tone="warning">Top Risk</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {highRiskPairs.slice(0, 2).map((item) => (
                  <div className="bg-[color:var(--panel-2)] px-3 py-3" key={item.pair.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--warning)]">
                        {item.pair.eventRiskBase >= 82 ? 'High Volatility' : 'Liquidity Gap'}
                      </div>
                      <div className="text-[9px] text-[var(--muted)]">{item.pair.symbol}</div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text)]">{item.pair.narrative}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">Compare Tool</h3>
              <div className="mt-4 space-y-2">
                {comparePairs.slice(0, 3).map((item) => (
                  <div className="flex items-center justify-between border-b border-[color:rgba(62,73,73,0.15)] py-2 text-[11px]" key={item.pair.id}>
                    <span className="text-[var(--muted)]">{topPriorityPair?.pair.symbol ?? item.pair.symbol} vs {item.pair.symbol}</span>
                    <span className={cn('font-mono', item.bias === 'bullish' ? 'text-[var(--accent)]' : item.bias === 'bearish' ? 'text-[var(--danger)]' : 'text-[var(--muted)]')}>
                      {item.monthPercent >= 0 ? '+' : ''}
                      {formatPercent(item.monthPercent)}
                    </span>
                  </div>
                ))}
                <button
                  className="mt-2 w-full bg-[color:var(--panel-3)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text)] transition hover:bg-[color:var(--panel-4)]"
                  onClick={() => navigate('/app/markets/compare')}
                  type="button"
                >
                  Open Full Correlation
                </button>
              </div>
            </Panel>
          </div>
        </div>

        <Panel className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ['major', 'Majors'],
                ['minor', 'Minors'],
                ['cross', 'Exotics'],
                ['high', 'Volatility'],
              ] as const).map(([value, label]) => {
                const active =
                  (value === 'high' && riskFilter === 'high') ||
                  (value !== 'high' && classificationFilter === value)
                return (
                  <button
                    className={cn(
                      'px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition',
                      active ? 'bg-[var(--accent)] text-[#003731]' : 'bg-[color:var(--panel-3)] text-[var(--muted)] hover:text-[var(--text)]',
                    )}
                    key={value}
                    onClick={() => {
                      if (value === 'high') {
                        setRiskFilter(riskFilter === 'high' ? 'all' : 'high')
                        return
                      }
                      setClassificationFilter(classificationFilter === value ? 'all' : value)
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['1D', '1W', '1M', '3M', '6M'] as const).map((value) => (
                <button
                  className={cn(
                    'px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition',
                    chartTimeframe === value ? 'bg-[color:var(--panel-3)] text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]',
                  )}
                  key={value}
                  onClick={() => setChartTimeframe(value)}
                  type="button"
                >
                  {value}
                </button>
              ))}
              <div className="relative">
                <input
                  className="border-none border-b border-[color:rgba(62,73,73,0.3)] bg-[color:var(--panel-4)] px-3 py-1.5 pl-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  placeholder="Search pair..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]">⌕</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[color:rgba(51,53,53,0.3)]">
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Pair</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Bid / Ask</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Spread</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">24H Chg</th>
                  <th className="px-4 py-3 text-center font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Trend</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Market sentiment</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPairs.map((item) => {
                  const daySeries = seed.priceSeries.find((series) => series.pairId === item.pair.id && series.timeframe === '1D')
                  const bid = item.currentPrice - item.pair.spreadEstimate * item.pair.pipPrecision * 0.5
                  const ask = item.currentPrice + item.pair.spreadEstimate * item.pair.pipPrecision * 0.5
                  const sentimentLong = Math.min(Math.max(50 + item.pair.sentimentScore - 50 + item.monthPercent * 14, 5), 95)
                  const trendSeries = daySeries?.points ?? []
                  return (
                    <tr
                      className={cn(
                        'cursor-pointer border-t border-[color:rgba(62,73,73,0.12)] transition hover:bg-[color:rgba(30,32,32,0.65)]',
                        topPriorityPair?.pair.id === item.pair.id ? 'bg-[color:rgba(30,32,32,0.55)]' : '',
                      )}
                      key={item.pair.id}
                      onClick={() => setFocusPairId(item.pair.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-6 w-1', item.monthPercent >= 0 ? 'bg-[var(--accent)]' : 'bg-[var(--danger)]')} />
                          <div>
                            <Link className="text-xs font-extrabold text-[var(--text)]" to={`/app/markets/${item.pair.id}`}>{item.pair.symbol.replace('/', ' / ')}</Link>
                            <div className="text-[9px] uppercase text-[var(--muted)]">
                              {currencyNameByCode[item.pair.baseCode] ?? item.pair.baseCode} / {currencyNameByCode[item.pair.quoteCode] ?? item.pair.quoteCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-[var(--text)]">{formatNumber(bid, item.pair.displayPrecision)}</span>
                          <span className="text-[var(--muted)]">/</span>
                          <span className="text-[var(--text)]">{formatNumber(ask, item.pair.displayPrecision)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-[2px] bg-[color:rgba(55,76,86,0.3)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">{item.pair.spreadEstimate}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('font-mono text-xs font-bold', item.dailyDeltaPercent >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]')}>
                          {item.dailyDeltaPercent >= 0 ? '+' : ''}
                          {formatPercent(item.dailyDeltaPercent)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="mx-auto h-6 w-20">
                          <svg className={cn('h-full w-full fill-none stroke-[2]', item.dailyDeltaPercent >= 0 ? 'stroke-[var(--accent)]' : 'stroke-[var(--danger)]')} viewBox="0 0 100 20">
                            <path d={trendSeries.length >= 2 ? trendSeries.map((point, index) => {
                              const min = Math.min(...trendSeries.map((p) => p.value))
                              const max = Math.max(...trendSeries.map((p) => p.value))
                              const x = (index / Math.max(trendSeries.length - 1, 1)) * 100
                              const y = 18 - ((point.value - min) / Math.max(max - min, 0.0001)) * 16
                              return `${index === 0 ? 'M' : 'L'}${x},${y}`
                            }).join(' ') : 'M0,10 L100,10'} />
                          </svg>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-1.5 flex-1 overflow-hidden bg-[color:var(--panel-3)]">
                            <div className="h-full bg-[var(--accent)]" style={{ width: `${sentimentLong}%` }} />
                            <div className="h-full bg-[color:rgba(255,180,171,0.4)]" style={{ width: `${100 - sentimentLong}%` }} />
                          </div>
                          <span className="font-mono text-[9px] font-bold text-[var(--muted)]">{formatNumber(sentimentLong, 0)}% LONG</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="bg-[color:var(--panel-3)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:bg-[color:var(--panel-4)]" onClick={(event) => { event.stopPropagation(); void toggleWatch(item.pair.id) }} type="button">
                            {watchedIds.includes(item.pair.id) ? 'Unwatch' : 'Watch'}
                          </button>
                          <button className="bg-[color:var(--panel-3)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:bg-[color:var(--panel-4)]" onClick={(event) => { event.stopPropagation(); navigate(`/app/simulation?pair=${item.pair.id}`) }} type="button">
                            Sim
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
  )
}

function FragmentRow<T extends { pair: Pair }>({
  label,
  comparePairs,
  render,
}: {
  label: string
  comparePairs: T[]
  render: (item: T) => ReactNode
}) {
  return (
    <>
      <div className="bg-[color:var(--panel-2)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      {comparePairs.map((item) => (
        <div className="bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--text)]" key={`${label}-${item.pair.id}`}>
          {render(item)}
        </div>
      ))}
    </>
  )
}

export const MarketComparePage = () => {
  const { user } = useAppState()
  const { data, loading } = useAsyncResource(() => appApi.listPairs(), [])
  const seed = getSeed()

  if (loading || !data) return <LoadingPanel label="Loading compare board…" />

  const selected = (user?.favoritePairs?.slice(0, 3).length ? user.favoritePairs.slice(0, 3) : ['eur-usd', 'gbp-usd', 'usd-jpy'])
  const pairs = data.filter((pair) => selected.includes(pair.id))
  const enriched = pairs.map((pair) => {
    const technical = seed.technicals.find((item) => item.pairId === pair.id)!
    const forecast = seed.forecasts.find((item) => item.pairId === pair.id)!
    const monthSeries = seed.priceSeries.find((item) => item.pairId === pair.id && item.timeframe === '1M')
    const price = getSeriesMove(monthSeries).last
    return {
      pair,
      technical,
      forecast,
      price,
      forecastWidth: Math.max(...forecast.uncertaintyCurve) * 100,
    }
  })

  return (
    <Page
      title="Pair Compare"
      description="Pair matrix."
      actions={<ActionLink to="/app/markets">Back</ActionLink>}
    >
      <Panel className="overflow-hidden p-0">
        <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[0.8fr_repeat(3,minmax(0,1fr))]">
          <div className="bg-[color:var(--panel)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Metric</div>
          {enriched.map((item) => (
            <Link className="bg-[color:var(--panel)] px-4 py-3" key={item.pair.id} to={`/app/markets/${item.pair.id}`}>
              <div className="font-display text-2xl font-semibold tracking-[-0.03em]">{item.pair.symbol}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{item.pair.narrative}</div>
            </Link>
          ))}
          {([
            { label: 'Current price', render: (item: (typeof enriched)[number]) => formatNumber(item.price, item.pair.displayPrecision) },
            { label: 'Trend', render: (item: (typeof enriched)[number]) => title(item.technical.trend) },
            { label: 'Volatility score', render: (item: (typeof enriched)[number]) => formatNumber(item.technical.volatilityScore, 0) },
            { label: 'Event risk', render: (item: (typeof enriched)[number]) => formatNumber(item.pair.eventRiskBase, 0) },
            { label: 'Spread estimate', render: (item: (typeof enriched)[number]) => formatNumber(item.pair.spreadEstimate, 1) },
            { label: 'Carry score', render: (item: (typeof enriched)[number]) => formatNumber(item.pair.carryScore, 0) },
            { label: 'Sentiment score', render: (item: (typeof enriched)[number]) => formatNumber(item.pair.sentimentScore, 0) },
            { label: 'Forecast width', render: (item: (typeof enriched)[number]) => formatNumber(item.forecastWidth, 0) },
          ] as Array<{ label: string; render: (item: (typeof enriched)[number]) => ReactNode }>).map(({ label, render }) => (
            <FragmentRow comparePairs={enriched} key={label} label={label} render={render} />
          ))}
        </div>
      </Panel>
    </Page>
  )
}

export const PairDetailPage = () => {
  const navigate = useNavigate()
  const params = useParams()
  const { setActiveSimulation, user } = useAppState()
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y'>(user?.settings.chartDefaults.timeframe ?? '3M')
  const [chartMode, setChartMode] = useState<'line' | 'area' | 'candlestick'>(user?.settings.chartDefaults.chartMode ?? 'line')
  const [overlays, setOverlays] = useState<string[]>(user?.settings.chartDefaults.overlays ?? ['ma', 'forecast'])
  const [watched, setWatched] = useState(false)
  const { data, loading } = useAsyncResource(() => appApi.getPairWorkspace(params.pairId ?? ''), [params.pairId, user?.id])

  useEffect(() => {
    if (params.pairId) appApi.saveVisited('pairs', params.pairId)
  }, [params.pairId])

  useEffect(() => {
    if (!params.pairId || !user) return
    const seed = getSeed()
    setWatched(seed.watchlist.some((item) => item.userId === user.id && item.entityType === 'pair' && item.entityId === params.pairId))
  }, [params.pairId, user?.id, data?.pair.id])

  if (loading || !data) return <LoadingPanel label="Loading pair workspace…" />

  const selectedSeries = data.series.find((item) => item.timeframe === timeframe) ?? data.series[0]
  const narrative = pairNarrative(data.pair, data.technical, data.base, data.quote, data.eventList, data.newsList)
  const move = getSeriesMove(selectedSeries)
  const lead = data.base.strengthScore - data.quote.strengthScore
  const leadCurrency = lead >= 0 ? data.base.code : data.quote.code
  const leadMagnitude = Math.abs(lead)

  return (
    <Page
      title={data.pair.symbol}
      description={`${data.base.name} vs ${data.quote.name}`}
      actions={
        <>
          <Badge tone={riskTone(data.eventRisk)}>{data.eventRisk >= 80 ? 'High event risk' : 'Event active'}</Badge>
          <PrimaryButton
            onClick={async () => {
              await appApi.toggleWatchlist('pair', data.pair.id)
              setWatched((value) => !value)
            }}
            secondary
            type="button"
          >
            {watched ? 'Unwatch pair' : 'Watch pair'}
          </PrimaryButton>
          <PrimaryButton
            onClick={() => {
              setActiveSimulation(appApi.buildSimulationFromPair(data.pair.id))
              navigate(`/app/simulation?pair=${data.pair.id}`)
            }}
            type="button"
          >
            Launch simulation
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-[color:var(--panel-2)] px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-display text-[2rem] font-semibold tracking-[-0.05em]">{data.pair.symbol}</div>
                  <Badge tone={trendTone(data.technical.trend) === 'up' ? 'accent' : trendTone(data.technical.trend) === 'down' ? 'danger' : 'default'}>
                    {title(data.technical.trend)}
                  </Badge>
                  <Badge tone={riskTone(data.eventRisk)}>{volatilityLabel(data.technical.volatilityScore)} volatility</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <div className="font-display text-3xl font-semibold">
                    {formatNumber(data.currentPrice, data.pair.displayPrecision)}
                  </div>
                  <div className={cn('text-sm font-semibold', move.delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                    {move.delta >= 0 ? '+' : ''}
                    {formatNumber(move.delta, data.pair.displayPrecision)}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {data.base.name} vs {data.quote.name}
                  </div>
                </div>
                <p className="mt-5 max-w-4xl text-sm leading-7 text-[var(--muted)]">{narrative}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Spread</div>
                    <div className="mt-2 text-lg font-semibold">{data.pair.spreadEstimate}</div>
                  </div>
                  <div className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Event risk</div>
                    <div className="mt-2 text-lg font-semibold">{data.eventRisk}</div>
                  </div>
                  <div className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Lead side</div>
                    <div className="mt-2 text-lg font-semibold">{leadCurrency}</div>
                  </div>
                  <div className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Driver</div>
                    <div className="mt-2 text-lg font-semibold">{title(driverLeader(data.technical.driverWeights))}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-px bg-[var(--line)]">
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Macro differential</div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {leadCurrency} carries the stronger profile right now by {formatNumber(leadMagnitude, 0)} strength points.
                  </div>
                </div>
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Technical summary</div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{data.technical.signalSummary}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Forecast posture</div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{data.forecast.disclaimer}</div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[color:var(--panel)] px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Technical workspace</div>
              <div className="flex flex-wrap gap-1">
                {(['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((value) => (
                  <ViewToggle active={value === timeframe} key={value} onClick={() => setTimeframe(value)}>
                    {value}
                  </ViewToggle>
                ))}
              </div>
            </div>
            <div className="space-y-4 bg-[color:var(--panel-2)] px-4 py-4">
              <div className="flex flex-wrap gap-1">
                {(['line', 'area', 'candlestick'] as const).map((value) => (
                  <ViewToggle active={value === chartMode} key={value} onClick={() => setChartMode(value)}>
                    {value}
                  </ViewToggle>
                ))}
                {['ma', 'bands', 'forecast'].map((overlay) => (
                  <button
                    className={cn(
                      'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition',
                      overlays.includes(overlay) ? 'bg-[rgba(112,216,200,0.15)] text-[var(--accent)]' : 'bg-[color:var(--panel-4)] text-[var(--muted)] hover:text-[var(--text)]',
                    )}
                    key={overlay}
                    onClick={() => setOverlays((items) => (items.includes(overlay) ? items.filter((item) => item !== overlay) : [...items, overlay]))}
                    type="button"
                  >
                    {overlay}
                  </button>
                ))}
              </div>
              <PriceChart chartMode={chartMode} forecast={data.forecast} overlays={overlays} series={selectedSeries} showForecast={overlays.includes('forecast')} />
              <div className="grid gap-3 md:grid-cols-4">
                <Stat label="RSI" value={formatNumber(data.technical.rsi, 0)} help={data.technical.rsi > 65 ? 'Momentum is elevated and can stretch further before it mean-reverts.' : 'Momentum remains active without a full stretch signal.'} />
                <Stat label="MACD" value={formatNumber(data.technical.macd)} help="Directional impulse versus signal line." />
                <Stat label="ATR" value={formatNumber(data.technical.atr)} help="Feeds volatility labels and scenario widths." />
                <Stat label="Trend channel" value={`${formatNumber(data.technical.channel.low)} - ${formatNumber(data.technical.channel.high)}`} help="Pair is trading inside this current structure band." />
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel>
              <SectionTitle eyebrow="Macro differential" title={`${data.base.code} versus ${data.quote.code}`} />
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label={`${data.base.code} strength`} tone={trendTone(data.technical.trend)} value={formatNumber(data.base.strengthScore, 0)} help={data.base.currentSummary} />
                <Stat label={`${data.quote.code} strength`} value={formatNumber(data.quote.strengthScore, 0)} help={data.quote.currentSummary} />
                <Stat label="Policy rate spread" value={formatPercent(data.base.macro.policyRate - data.quote.macro.policyRate, 2)} help={`${data.base.code} minus ${data.quote.code}.`} />
                <Stat label="Inflation spread" value={formatPercent(data.base.macro.inflation - data.quote.macro.inflation, 2)} help="Current inflation differential between the two economies." />
              </div>
              <div className="mt-4 grid gap-3">
                <DriverBar label={`${data.base.code} event sensitivity`} value={data.base.eventSensitivity} />
                <DriverBar label={`${data.quote.code} event sensitivity`} value={data.quote.eventSensitivity} />
                <DriverBar label="Technical driver weight" value={data.technical.driverWeights.technical} />
                <DriverBar label="Macro driver weight" value={data.technical.driverWeights.macro} />
                <DriverBar label="Event driver weight" value={data.technical.driverWeights.event} />
                <DriverBar label="Sentiment driver weight" value={data.technical.driverWeights.sentiment} />
              </div>
            </Panel>

            <Panel>
              <SectionTitle eyebrow="Forecast" title="Fan chart" />
              <ForecastChart forecast={data.forecast} />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(data.forecast.driverImportance).map(([label, value]) => (
                  <Stat key={label} label={title(label)} value={formatPercent(value, 0)} help="Illustrative contribution weight." />
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Panel>
              <SectionTitle eyebrow="Event risk" title="Catalysts" />
              <div className="space-y-3">
                {data.eventList.slice(0, 5).map((event) => (
                  <Link className="block border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 transition hover:border-[rgba(255,186,56,0.28)] hover:bg-[color:var(--panel-3)]" key={event.id} to={`/app/events/${event.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-[var(--text)]">{event.title}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(event.scheduledAt)} · {event.region}</div>
                      </div>
                      <Badge tone={event.impact === 'high' ? 'danger' : 'warning'}>{event.impact}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="bg-[color:var(--panel)] px-3 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Prior</div>
                        <div className="mt-2 text-sm">{event.prior}</div>
                      </div>
                      <div className="bg-[color:var(--panel)] px-3 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Forecast</div>
                        <div className="mt-2 text-sm">{event.forecast}</div>
                      </div>
                      <div className="bg-[color:var(--panel)] px-3 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Actual</div>
                        <div className="mt-2 text-sm">{event.actual ?? 'Pending'}</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{event.summary ?? event.scenarioNarrative ?? 'Latest official release linked to this pair.'}</p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionTitle eyebrow="News" title="Context" />
              <div className="space-y-4">
                {data.newsList.slice(0, 4).map((item) => (
                  <NewsCard item={item} key={item.id} />
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Simulation" title="Quick launch" />
            <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
              {data.pair.simulationPresets.slice(0, 4).map((preset) => (
                <button
                  className="block w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-left transition hover:border-[rgba(112,216,200,0.3)] hover:bg-[color:var(--panel-3)]"
                  key={preset.name}
                  onClick={() => {
                    setActiveSimulation(appApi.buildSimulationFromPair(data.pair.id, preset.direction))
                    navigate(`/app/simulation?pair=${data.pair.id}`)
                  }}
                  type="button"
                >
                  <div className="font-semibold text-[var(--text)]">{preset.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {preset.direction} · {preset.leverage}x leverage
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Saved simulations" title="My stored scenarios" />
            <div className="space-y-3">
              {data.simulations.length ? data.simulations.slice(0, 4).map((simulation) => (
                <Link className="block border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 transition hover:border-[rgba(112,216,200,0.3)] hover:bg-[color:var(--panel-3)]" key={simulation.id} to={`/app/simulation?simulation=${simulation.id}`}>
                  <div className="font-semibold">{simulation.scenarioType}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {simulation.direction} · Net {formatNumber(simulation.outputs.netPnL, 0)}
                  </div>
                </Link>
              )) : <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm text-[var(--muted)]">No saved scenarios yet for this pair.</div>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Portfolio relevance" title="Open exposure" />
            <div className="space-y-3">
              {data.positions.length ? data.positions.map((position) => (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={position.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{title(position.direction)} exposure</div>
                    <div className={cn('text-sm font-semibold', position.unrealizedPnL >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                      {position.unrealizedPnL >= 0 ? '+' : ''}
                      {formatNumber(position.unrealizedPnL, 0)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    Entry {formatNumber(position.entry, data.pair.displayPrecision)} · {position.leverage}x leverage
                  </div>
                </div>
              )) : <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm text-[var(--muted)]">No open paper positions in the active persona.</div>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Linked notes" title="Research trail" />
            <div className="space-y-4">
              {data.notes.length ? data.notes.slice(0, 2).map((note) => (
                <NoteCard key={note.id} note={note} />
              )) : <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 text-sm text-[var(--muted)]">No linked notes for this pair yet.</div>}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
