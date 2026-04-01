import { Link } from 'react-router-dom'
import { StrengthChart } from '../../components/charts/analytics'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { buildEntityLabel } from '../../domain/selectors'
import { formatCurrency } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

const buildSparklinePath = (values: number[]) => {
  if (!values.length) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 20 - ((value - min) / range) * 18
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export const DashboardPage = () => {
  const { user } = useAppState()
  const { data, loading } = useAsyncResource(() => appApi.getCurrentUserWorkspace(), [user?.id])
  const seed = getSeed()

  if (loading || !data?.dashboard || !user) {
    return <div className="p-6 text-sm text-[var(--muted)]">Loading dashboard workspace…</div>
  }

  const { dashboard } = data
  const portfolio = dashboard.portfolio?.portfolio
  const pairSeries = new Map(
    seed.priceSeries
      .filter((series) => series.timeframe === '1M')
      .map((series) => [series.pairId, series.points.map((point) => point.value)]),
  )

  const currencyHeat = dashboard.strength.slice(0, 6)
  const strengthBase = currencyHeat.map((item) => item.strengthScore)
  const minStrength = Math.min(...strengthBase)
  const maxStrength = Math.max(...strengthBase)

  return (
    <div className="grid gap-4">
      <section className="border-l-4 border-[#70d8c8] bg-[#1c1b1b] px-4 py-3">
        <h1 className="font-display text-2xl font-bold text-[#e5e2e1]">Good morning, {user.displayName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#b1cad7]">
          <span>{dashboard.summary}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#70d8c8]">
            {user.analysisFocus} focus
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#879390]">
            {user.settings.defaultAccountCurrency} account
          </span>
        </p>
      </section>

      <div className="grid grid-cols-12 gap-1 bg-[#0e0e0e]">
        <div className="col-span-12 flex flex-col gap-1 lg:col-span-8">
          <section className="grid grid-cols-1 gap-1 md:grid-cols-3">
            {dashboard.highlightedPairs.slice(0, 3).map((pair) => {
              const values = pairSeries.get(pair.id) ?? []
              const seriesPath = buildSparklinePath(values)
              const last = values.at(-1) ?? 0
              const prev = values.at(-2) ?? last
              const delta = last - prev
              const stroke = delta < 0 ? '#ffb4ab' : pair.eventRiskBase > 70 ? '#ffba38' : '#70d8c8'
              const status = pair.eventRiskBase > 80 ? 'Elevated event risk' : delta < 0 ? 'Soft bias' : 'Stable'

              return (
                <Link className="bg-[#1c1b1b] p-3 transition hover:bg-[#2a2a2a]" key={pair.id} to={`/app/markets/${pair.id}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#b1cad7]">{pair.symbol}</span>
                    <span className={`px-1.5 py-0.5 font-mono text-[9px] uppercase ${pair.eventRiskBase > 80 ? 'bg-[#ffb4ab1a] text-[#ffb4ab]' : delta < 0 ? 'bg-[#ffba381a] text-[#ffba38]' : 'bg-[#70d8c81a] text-[#70d8c8]'}`}>
                      {status}
                    </span>
                  </div>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-[#e5e2e1]">
                      {last.toFixed(pair.displayPrecision)}
                    </span>
                    <span className={`text-[10px] ${delta < 0 ? 'text-[#ffb4ab]' : 'text-[#70d8c8]'}`}>
                      {delta >= 0 ? '+' : ''}
                      {delta.toFixed(pair.displayPrecision)}
                    </span>
                  </div>
                  <div className="relative mb-2 h-8 overflow-hidden bg-[#0e0e0e]">
                    {seriesPath ? (
                      <svg className="absolute inset-0 h-full w-full fill-none stroke-[1.2]" viewBox="0 0 100 20">
                        <path d={seriesPath} stroke={stroke} />
                      </svg>
                    ) : null}
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase text-[#bcc9c5]">
                    <span>Spread {pair.spreadEstimate}</span>
                    <span>Carry {pair.carryScore}</span>
                  </div>
                </Link>
              )
            })}
          </section>

          <section className="bg-[#1c1b1b] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9c5]">Currency Strength</h2>
              <div className="flex gap-1">
                <div className="size-2 bg-[#ffb4ab]" />
                <div className="size-2 bg-[#ffb4ab66]" />
                <div className="size-2 bg-[#3d4946]" />
                <div className="size-2 bg-[#70d8c866]" />
                <div className="size-2 bg-[#70d8c8]" />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.62fr_0.38fr]">
              <div className="min-w-0">
                <StrengthChart data={dashboard.strength.slice(0, 8)} />
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] lg:grid-cols-2">
                {currencyHeat.map((item) => {
                  const normalized = (item.strengthScore - minStrength) / Math.max(maxStrength - minStrength, 1)
                  const background =
                    normalized > 0.7
                      ? 'bg-[#70d8c833] text-[#70d8c8]'
                      : normalized < 0.3
                        ? 'bg-[#ffb4ab26] text-[#ffb4ab]'
                        : 'bg-[#2a2a2a] text-[#b1cad7]'
                  return (
                    <div className={`flex min-h-16 flex-col justify-between p-3 ${background}`} key={item.code}>
                      <span className="font-display text-xl font-bold">{item.code}</span>
                      <span className="font-mono">{item.strengthScore.toFixed(0)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="bg-[#1c1b1b] p-4">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9c5]">Intelligence Stream</h2>
            <div className="space-y-4">
              {dashboard.news.slice(0, 3).map((item) => (
                <div className="flex gap-4 border-l border-[#70d8c8] pl-4 py-1" key={item.id}>
                  <div className="w-16 shrink-0 text-[10px] text-[#b1cad7]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <h3 className="mb-1 text-xs font-bold uppercase leading-tight text-[#e5e2e1]">{item.headline}</h3>
                    <p className="text-[10px] leading-5 text-[#bcc9c5]">
                      <span className="font-bold text-[#70d8c8]">Why it matters:</span> {item.whyItMatters}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="col-span-12 flex flex-col gap-1 lg:col-span-4">
          <section className="bg-[#1c1b1b] p-4">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9c5]">Portfolio Snapshot</h2>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] font-bold uppercase text-[#bcc9c5]">Equity</span>
                <div className="font-display text-lg font-bold text-[#70d8c8]">{formatCurrency(portfolio?.equity ?? 0)}</div>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-[#bcc9c5]">Margin Used</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="font-display text-lg font-bold text-[#e5e2e1]">
                    {portfolio?.equity ? (((portfolio.marginUsed ?? 0) / portfolio.equity) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="h-1 flex-1 bg-[#0e0e0e]">
                    <div
                      className="h-full bg-[#70d8c8]"
                      style={{ width: `${portfolio?.equity ? Math.min(((portfolio.marginUsed ?? 0) / portfolio.equity) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {(dashboard.portfolio?.openPositions ?? []).slice(0, 3).map((position) => (
                <Link className="flex items-center justify-between bg-[#0e0e0e] p-2" key={position.id} to={`/app/markets/${position.pairId}`}>
                  <div>
                    <div className="text-xs font-bold uppercase text-[#e5e2e1]">{position.pairId.toUpperCase()}</div>
                    <div className="text-[10px] uppercase text-[#bcc9c5]">{position.direction} · {position.leverage}x</div>
                  </div>
                  <div className={`font-mono text-[11px] ${position.unrealizedPnL >= 0 ? 'text-[#70d8c8]' : 'text-[#ffb4ab]'}`}>
                    {formatCurrency(position.unrealizedPnL)}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#1c1b1b] p-4">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9c5]">Upcoming Macro Events</h2>
            <div className="space-y-2">
              {dashboard.events.slice(0, 4).map((event) => (
                <Link className={`flex items-center gap-4 bg-[#0e0e0e] p-3 border-l-2 ${event.impact === 'high' ? 'border-[#ffb4ab]' : 'border-[#ffba38]'}`} key={event.id} to={`/app/events/${event.id}`}>
                  <div className="min-w-[72px] text-center">
                    <div className="text-[10px] uppercase text-[#bcc9c5]">Urgency</div>
                    <div className={`font-display text-lg font-bold ${event.impact === 'high' ? 'text-[#ffb4ab]' : 'text-[#ffba38]'}`}>{event.urgency}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase text-[#e5e2e1]">{event.title}</div>
                    <div className="text-[10px] text-[#bcc9c5]">{event.region} · {event.forecast} forecast · {event.prior} prior</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#1c1b1b] p-4">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9c5]">Continue Analysis</h2>
            <div className="space-y-2">
              {dashboard.simulations.map((simulation) => (
                <Link className="block bg-[#0e0e0e] p-3" key={simulation.id} to={`/app/simulation?simulation=${simulation.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase text-[#e5e2e1]">{simulation.pairId.toUpperCase()}</div>
                    <div className={`font-mono text-[10px] uppercase ${simulation.direction === 'long' ? 'text-[#70d8c8]' : 'text-[#ffb4ab]'}`}>{simulation.direction}</div>
                  </div>
                  <div className="mt-1 text-[10px] text-[#bcc9c5]">{simulation.scenarioType}</div>
                </Link>
              ))}
              {dashboard.notes.slice(0, 2).map((note) => (
                <Link className="block bg-[#0e0e0e] p-3" key={note.id} to="/app/notes">
                  <div className="text-xs font-bold uppercase text-[#e5e2e1]">{note.title}</div>
                  <div className="mt-1 text-[10px] leading-5 text-[#bcc9c5]">{note.body.slice(0, 120)}...</div>
                </Link>
              ))}
              {data.notifications.slice(0, 2).map((item) => (
                <Link className="block bg-[#0e0e0e] p-3" key={item.id} to={item.href ?? '/app/watchlist'}>
                  <div className="text-xs font-bold uppercase text-[#e5e2e1]">{item.title}</div>
                  <div className="mt-1 text-[10px] leading-5 text-[#bcc9c5]">{item.body}</div>
                </Link>
              ))}
              {dashboard.watchlist.slice(0, 2).map((item) => (
                <Link className="block bg-[#0e0e0e] p-3" key={item.id} to={appApi.getEntityHref(item.entityType, item.entityId)}>
                  <div className="text-xs font-bold uppercase text-[#e5e2e1]">
                    {buildEntityLabel(seed, item.entityType, item.entityId)}
                  </div>
                  <div className="mt-1 text-[10px] uppercase text-[#bcc9c5]">{item.entityType}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
