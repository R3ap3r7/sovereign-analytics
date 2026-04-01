import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ForecastChart, PriceChart } from '../../components/charts/analytics'
import { NewsCard, NoteCard, PairCard } from '../../components/domain/cards'
import { ActionLink, Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { pairNarrative } from '../../domain/selectors'
import { formatNumber, formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

export const MarketsPage = () => {
  const navigate = useNavigate()
  const [baseFilter, setBaseFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const { data, loading } = useAsyncResource(() => appApi.listPairs(), [])
  if (loading || !data) return <LoadingPanel label="Loading market explorer…" />
  const pairs = data.filter((pair) => (baseFilter === 'all' ? true : pair.baseCode === baseFilter)).filter((pair) => (riskFilter === 'all' ? true : riskFilter === 'high' ? pair.eventRiskBase >= 70 : pair.eventRiskBase < 70))
  return (
    <Page title="Market Explorer" description="Compare the same canonical pair objects used across detail pages, simulations, forecasts, watchlists, and the portfolio.">
      <Panel className="flex flex-wrap gap-3">
        <select className="rounded-full border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-2 text-sm" onChange={(event) => setBaseFilter(event.target.value)} value={baseFilter}>
          <option value="all">All base currencies</option>
          {['USD', 'EUR', 'GBP', 'AUD'].map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <select className="rounded-full border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-2 text-sm" onChange={(event) => setRiskFilter(event.target.value)} value={riskFilter}>
          <option value="all">All event risk</option>
          <option value="high">High event risk</option>
          <option value="lower">Lower event risk</option>
        </select>
        <ActionLink to="/app/markets/compare">Open compare board</ActionLink>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {pairs.map((pair) => (
          <PairCard
            key={pair.id}
            href={`/app/markets/${pair.id}`}
            meta={
              <div className="flex items-center justify-between">
                <span>{pair.baseCode}/{pair.quoteCode}</span>
                <button
                  className="rounded-full border border-[var(--line)] px-3 py-1 text-xs"
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(`/app/simulation?pair=${pair.id}`)
                  }}
                  type="button"
                >
                  Simulate
                </button>
              </div>
            }
            pair={pair}
            subtitle={pair.narrative}
          />
        ))}
      </div>
    </Page>
  )
}

export const MarketComparePage = () => {
  const { data, loading } = useAsyncResource(() => appApi.listPairs(), [])
  const selected = ['eur-usd', 'gbp-usd', 'usd-jpy']
  if (loading || !data) return <LoadingPanel label="Loading compare board…" />
  const pairs = data.filter((pair) => selected.includes(pair.id))
  return (
    <Page title="Pair Compare" description="Side-by-side comparison for volatility, event risk, spread, and narrative alignment.">
      <Panel>
        <SectionTitle eyebrow="Comparison matrix" title="Selected pairs" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr>
                <th className="pb-3">Pair</th>
                <th className="pb-3">Carry</th>
                <th className="pb-3">Sentiment</th>
                <th className="pb-3">Event risk</th>
                <th className="pb-3">Spread</th>
                <th className="pb-3">Narrative</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair) => (
                <tr className="border-t border-[var(--line)]" key={pair.id}>
                  <td className="py-3 font-medium"><Link to={`/app/markets/${pair.id}`}>{pair.symbol}</Link></td>
                  <td>{pair.carryScore}</td>
                  <td>{pair.sentimentScore}</td>
                  <td>{pair.eventRiskBase}</td>
                  <td>{pair.spreadEstimate}</td>
                  <td className="max-w-sm py-3 text-[var(--muted)]">{pair.narrative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Page>
  )
}

export const PairDetailPage = () => {
  const params = useParams()
  const { setActiveSimulation, user } = useAppState()
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y'>('3M')
  const { data, loading } = useAsyncResource(() => appApi.getPairWorkspace(params.pairId ?? ''), [params.pairId, user?.id])
  if (loading || !data) return <LoadingPanel label="Loading pair workspace…" />
  const selectedSeries = data.series.find((item) => item.timeframe === timeframe) ?? data.series[0]
  const narrative = pairNarrative(data.pair, data.technical, data.base, data.quote, data.eventList, data.newsList)

  return (
    <Page
      title={data.pair.symbol}
      description={`${data.base.name} versus ${data.quote.name}. Pair detail blends chart structure, macro comparison, event exposure, forecast context, notes, simulations, and portfolio relevance.`}
      actions={
        <>
          <Badge tone={data.eventRisk > 75 ? 'danger' : 'warning'}>Event risk {data.eventRisk}</Badge>
          <PrimaryButton
            onClick={() => setActiveSimulation(appApi.buildSimulationFromPair(data.pair.id))}
            type="button"
          >
            Prefill simulation
          </PrimaryButton>
        </>
      }
    >
      <Panel className="grid gap-4 lg:grid-cols-4">
        <Stat label="Latest price" value={formatNumber(data.currentPrice, data.pair.displayPrecision)} />
        <Stat label="Trend status" value={data.technical.trend} help={data.technical.signalSummary} />
        <Stat label="Volatility score" value={data.technical.volatilityScore} help="Shared across explorer filters, forecasts, and alert logic." />
        <Stat label="Driver summary" value={narrative} help="Computed from linked currencies, technical state, news, and events." />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel>
          <SectionTitle eyebrow="Technical workspace" title="Chart and indicator overlays" detail="Timeframe switching reads from the same seeded pair history used in forecast and strategy views." />
          <div className="mb-4 flex flex-wrap gap-2">
            {(['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((value) => (
              <button className={`rounded-full border px-3 py-1.5 text-xs ${value === timeframe ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'}`} key={value} onClick={() => setTimeframe(value)} type="button">
                {value}
              </button>
            ))}
          </div>
          <PriceChart forecast={data.forecast} series={selectedSeries} showForecast />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Stat label="RSI" value={formatNumber(data.technical.rsi, 0)} help={data.technical.rsi > 65 ? 'Elevated momentum with overbought risk.' : 'Momentum is not yet stretched.'} />
            <Stat label="MACD" value={formatNumber(data.technical.macd)} help="Directional impulse versus signal line." />
            <Stat label="ATR" value={formatNumber(data.technical.atr)} help="Feeds volatility buckets and scenario widths." />
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Forecast" title="Illustrative path overlay" detail={data.forecast.disclaimer} />
          <ForecastChart forecast={data.forecast} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle eyebrow="Macro differential" title={`${data.base.code} vs ${data.quote.code}`} />
          <div className="grid gap-3 md:grid-cols-2">
            <Stat label={`${data.base.code} strength`} value={formatPercent(data.base.strengthScore, 0)} help={data.base.currentSummary} />
            <Stat label={`${data.quote.code} strength`} value={formatPercent(data.quote.strengthScore, 0)} help={data.quote.currentSummary} />
            <Stat label="Policy rate differential" value={formatNumber(data.base.macro.policyRate - data.quote.macro.policyRate)} help="Simple macro spread used in pair narrative and forecast weighting." />
            <Stat label="Risk balance" value={data.base.riskScore > data.quote.riskScore ? data.base.code : data.quote.code} help="Higher risk score side contributes more uncertainty to the pair." />
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Event risk" title="Upcoming and recent events" />
          <div className="space-y-3">
            {data.eventList.slice(0, 4).map((event) => (
              <Link className="block rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={event.id} to={`/app/events/${event.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{event.title}</div>
                  <Badge tone={event.impact === 'high' ? 'danger' : 'warning'}>{event.impact}</Badge>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">{event.scenarioNarrative}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionTitle eyebrow="News context" title="Why this pair matters right now" />
          <div className="space-y-4">
            {data.newsList.slice(0, 4).map((item) => (
              <NewsCard item={item} key={item.id} />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="Related context" title="Simulations, positions, notes" />
          <div className="space-y-4">
            <Panel>
              <h3 className="text-base font-semibold">Saved simulations</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {data.simulations.slice(0, 3).map((simulation) => (
                  <Link className="block rounded-xl border border-[var(--line)] px-3 py-2" key={simulation.id} to={`/app/simulation?simulation=${simulation.id}`}>
                    {simulation.scenarioType} · Net {formatNumber(simulation.outputs.netPnL)}
                  </Link>
                ))}
              </div>
            </Panel>
            <Panel>
              <h3 className="text-base font-semibold">Portfolio relevance</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {data.positions.length ? data.positions.map((position) => <div key={position.id}>{position.direction} · {formatNumber(position.unrealizedPnL)}</div>) : 'No open positions for this pair in the active persona.'}
              </div>
            </Panel>
            {data.notes.slice(0, 2).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}
