import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, LoadingPanel } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/api'
import { formatNumber, formatPercent, title } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

const scoreTone = (value: number) => {
  if (value >= 70) return 'accent'
  if (value >= 50) return 'warning'
  return 'default'
}

const strengthLabel = (value: number) => {
  if (value >= 70) return 'strong'
  if (value >= 50) return 'balanced'
  return 'soft'
}

export const CurrenciesPage = () => {
  const { data, loading } = useAsyncResource(() => appApi.listCurrencies(), [])
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'reserve currency' | 'safe haven' | 'policy-sensitive' | 'cyclical'>('all')
  const [heroCode, setHeroCode] = useState('USD')

  if (loading || !data) return <LoadingPanel label="Loading currency intelligence…" />

  const seed = getSeed()
  const strongest = [...data].sort((a, b) => b.strengthScore - a.strengthScore)
  const filteredCurrencies = data.filter((item) => (categoryFilter === 'all' ? true : item.classificationTags.includes(categoryFilter)))
  const heroCurrency = data.find((item) => item.code === heroCode) ?? data.find((item) => item.code === 'USD') ?? strongest[0]
  const heroPairs = heroCurrency.relatedPairIds.map((pairId) => seed.pairs.find((item) => item.id === pairId)).filter(Boolean).slice(0, 3)
  const rankingStrip = strongest.slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="bg-[color:var(--panel)] px-6 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap border-b border-[color:rgba(141,164,179,0.08)]">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--muted)] uppercase tracking-[0.16em] border-r border-[color:rgba(141,164,179,0.12)] pr-4">G10 Strategy</div>
        <div className="flex gap-4 items-center">
          {rankingStrip.map((currency, index) => {
            const delta = currency.strengthScore - 50
            return (
              <button
                className="flex items-center gap-1.5 px-3 py-1 bg-[color:var(--panel-4)] transition hover:bg-[color:var(--panel-3)]"
                key={currency.code}
                onClick={() => setHeroCode(currency.code)}
                type="button"
              >
                <span className={index === 0 ? 'font-bold text-[var(--accent)]' : 'font-bold text-[var(--text)]'}>{index + 1}. {currency.code}</span>
                <span className={delta >= 0 ? 'text-[var(--accent)] text-[11px]' : 'text-[var(--danger)] text-[11px]'}>
                  {delta >= 0 ? '+' : ''}{formatPercent(delta / 100)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="bg-[color:var(--panel)] p-4 space-y-4">
            <h3 className="font-display font-semibold text-sm tracking-[-0.02em] text-[var(--text)]">Benchmark Comparison</h3>
            <div className="space-y-3">
              {heroPairs.map((pair) => (
                <Link className="block p-3 bg-[color:var(--panel-2)] transition hover:bg-[color:var(--panel-3)]" key={pair!.id} to={`/app/markets/${pair!.id}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-[var(--text)]">{pair!.symbol}</div>
                      <div className="text-[11px] text-[var(--muted)]">Event risk {pair!.eventRiskBase} · Carry {pair!.carryScore}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-[var(--text)]">{formatNumber(pair!.spreadEstimate, 1)}</div>
                      <div className={pair!.sentimentScore >= 50 ? 'text-[11px] text-[var(--accent)]' : 'text-[11px] text-[var(--danger)]'}>
                        {pair!.sentimentScore >= 50 ? '+' : ''}{formatNumber(pair!.sentimentScore - 50, 0)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Global Volatility</span>
              <span className="text-[11px] text-[var(--accent)]">Live</span>
            </div>
            <div className="grid grid-cols-8 gap-1 h-28 items-end">
              {strongest.slice().reverse().map((currency, index) => (
                <div key={currency.code} className="bg-[rgba(105,211,192,0.12)]" style={{ height: `${Math.max(18, currency.eventSensitivity - index * 3)}%` }} />
              ))}
            </div>
            <div className="mt-3 h-1.5 bg-[color:var(--panel-3)] overflow-hidden">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(28, heroCurrency.eventSensitivity)}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-[var(--muted)]">
              <span>{heroCurrency.code} sensitivity {formatNumber(heroCurrency.eventSensitivity, 0)}</span>
              <span>Risk {formatNumber(heroCurrency.riskScore, 0)}</span>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-[color:var(--panel)] overflow-hidden border-l-4 border-[var(--accent)]">
            <div className="p-6 grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[color:var(--panel-3)] flex items-center justify-center">
                    <span className="font-display text-xl font-bold text-[var(--accent)]">{heroCurrency.code}</span>
                  </div>
                  <div>
                    <h1 className="font-display font-extrabold text-[2rem] text-[var(--text)] tracking-[-0.05em]">{heroCurrency.regionName} {heroCurrency.name}</h1>
                    <p className="text-xs text-[var(--muted)] font-medium">{heroCurrency.classificationTags.slice(0, 2).join(' · ')} · {title(heroCurrency.centralBankState.currentTone)} outlook</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-[color:var(--panel-4)] p-3">
                    <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] mb-1">Strength Score</div>
                    <div className="text-xl font-display font-extrabold text-[var(--accent)]">{formatNumber(heroCurrency.strengthScore, 1)}</div>
                    <div className="text-[10px] text-[var(--accent)]">{strengthLabel(heroCurrency.strengthScore)}</div>
                  </div>
                  <div className="bg-[color:var(--panel-4)] p-3">
                    <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] mb-1">Policy Stance</div>
                    <div className="text-xl font-display font-extrabold text-[var(--warning)]">{title(heroCurrency.centralBankState.currentTone)}</div>
                    <div className="text-[10px] text-[var(--warning)]">{heroCurrency.centralBankState.expectation}</div>
                  </div>
                  <div className="bg-[color:var(--panel-4)] p-3">
                    <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] mb-1">Policy Rate</div>
                    <div className="text-xl font-display font-extrabold text-[var(--text)]">{formatPercent(heroCurrency.macro.policyRate)}</div>
                    <div className="text-[10px] text-[var(--accent)]">Yield supported</div>
                  </div>
                </div>
              </div>

              <div className="bg-[color:var(--panel-4)] p-4 h-48">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-[0.16em]">{heroCurrency.code} Driver Stack</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <div className="w-2 h-2 rounded-full bg-[color:var(--panel-3)]" />
                  </div>
                </div>
                <div className="flex h-28 items-end gap-2 px-1">
                  {heroCurrency.drivers.slice(0, 6).map((driver) => (
                    <div className="flex-1" key={driver.label}>
                      <div className="bg-[linear-gradient(180deg,rgba(105,211,192,0.9),rgba(105,211,192,0.15))]" style={{ height: `${Math.max(18, driver.weight * 100)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{heroCurrency.currentSummary}</div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'All'],
              ['reserve currency', 'Reserve'],
              ['safe haven', 'Safe Haven'],
              ['policy-sensitive', 'Policy Sensitive'],
              ['cyclical', 'Cyclical'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategoryFilter(value)}
                className={categoryFilter === value ? 'px-3 py-1.5 bg-[color:var(--panel-3)] text-[var(--accent)] text-[11px] font-semibold uppercase tracking-[0.12em]' : 'px-3 py-1.5 bg-[color:var(--panel)] text-[var(--muted)] text-[11px] font-semibold uppercase tracking-[0.12em] hover:text-[var(--text)]'}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCurrencies.map((currency) => (
              <Link key={currency.code} to={`/app/currencies/${currency.code}`}>
                <div className="h-full bg-[color:var(--panel)] p-4 transition hover:bg-[color:var(--panel-2)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{currency.regionName}</div>
                      <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">{currency.code}</h2>
                      <div className="mt-1 text-sm text-[var(--muted)]">{currency.name}</div>
                    </div>
                    <Badge tone={scoreTone(currency.strengthScore)}>{strengthLabel(currency.strengthScore)}</Badge>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="bg-[color:var(--panel-4)] px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Policy rate</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatPercent(currency.macro.policyRate)}</div>
                    </div>
                    <div className="bg-[color:var(--panel-4)] px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Event sensitivity</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatNumber(currency.eventSensitivity, 0)}</div>
                    </div>
                    <div className="bg-[color:var(--panel-4)] px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Risk</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatNumber(currency.riskScore, 0)}</div>
                    </div>
                    <div className="bg-[color:var(--panel-4)] px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Reserve role</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatNumber(currency.macro.reserveRole, 0)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {currency.classificationTags.slice(0, 3).map((tag) => (
                      <span className="bg-[color:var(--panel-4)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 text-sm leading-6 text-[var(--muted)]">{currency.currentSummary}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const CurrencyDetailPage = () => {
  const { user } = useAppState()
  const params = useParams()
  const { data, loading } = useAsyncResource(() => appApi.getCurrencyWorkspace(params.currencyCode ?? ''), [params.currencyCode, user?.id])

  if (loading || !data) return <LoadingPanel label="Loading currency profile…" />

  const { currency, pairs, events, news, notes } = data
  const relatedPairs = pairs.slice(0, 5)
  const timeline = currency.historicalNarrative.slice(0, 4)

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-5xl font-black tracking-[-0.08em] text-[var(--text)] sm:text-6xl">{currency.code}</h1>
            <div className="hidden h-12 w-px bg-[color:rgba(141,164,179,0.24)] sm:block" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{currency.name}</div>
              <div className="mt-1 text-sm font-medium text-[var(--accent)]">{currency.regionName} · {currency.centralBank}</div>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">{currency.currentSummary}</p>
          <div className="flex flex-wrap gap-2">
            {currency.classificationTags.map((tag) => (
              <span key={tag} className="bg-[color:var(--panel)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[color:var(--panel)] px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center bg-[color:var(--panel-2)] text-[var(--accent)]">
            ¥
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Central bank</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)]">{currency.centralBank}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border-l-2 border-[var(--accent)] bg-[color:var(--panel)] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Current Strength</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold tabular-nums text-[var(--text)]">{formatNumber(currency.strengthScore, 1)}</span>
            <span className="text-[11px] text-[var(--accent)]">{strengthLabel(currency.strengthScore)}</span>
          </div>
          <div className="mt-3 h-1.5 bg-[color:var(--panel-3)]">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(6, currency.strengthScore)}%` }} />
          </div>
        </div>
        <div className="border-l-2 border-[color:rgba(141,164,179,0.32)] bg-[color:var(--panel)] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Risk Score</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold tabular-nums text-[var(--text)]">{formatNumber(currency.riskScore, 0)}</span>
            <span className={currency.riskScore >= 70 ? 'text-[11px] text-[var(--danger)]' : 'text-[11px] text-[var(--muted)]'}>
              {currency.riskScore >= 70 ? 'elevated' : 'stable'}
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={index < Math.ceil(currency.riskScore / 25) ? 'h-1.5 flex-1 bg-[var(--accent)]' : 'h-1.5 flex-1 bg-[color:var(--panel-3)]'}
              />
            ))}
          </div>
        </div>
        <div className="border-l-2 border-[var(--warning)] bg-[color:var(--panel)] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Event Sensitivity</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold tabular-nums text-[var(--text)]">{formatNumber(currency.eventSensitivity, 0)}</span>
            <span className="text-[11px] text-[var(--warning)]">{currency.eventSensitivity >= 75 ? 'high' : 'moderate'}</span>
          </div>
          <div className="mt-3 h-1.5 bg-[color:var(--panel-3)]">
            <div className="h-full bg-[var(--warning)]" style={{ width: `${Math.max(8, currency.eventSensitivity)}%` }} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Macro Posture</div>
            <div className="space-y-3">
              {[
                ['Core CPI', formatPercent(currency.macro.inflation)],
                ['GDP Growth', formatPercent(currency.macro.gdpGrowth)],
                ['Unemployment', formatPercent(currency.macro.unemployment)],
                ['Trade Balance', formatNumber(currency.macro.tradeBalance)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--muted)]">{label}</span>
                  <span className="font-semibold tabular-nums text-[var(--text)]">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{currency.centralBank}</div>
            <div className="space-y-3">
              {[
                ['Base Rate', formatPercent(currency.macro.policyRate)],
                ['Bias', title(currency.centralBankState.currentTone)],
                ['Expectation', currency.centralBankState.expectation],
                ['Summary', currency.centralBankState.summary],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-[var(--muted)]">{label}</span>
                  <span className="max-w-[14rem] text-right font-semibold text-[var(--text)]">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-[color:var(--panel)] p-4">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Driver Attribution</div>
          <div className="space-y-4">
            {currency.drivers.map((driver) => (
              <div key={driver.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  <span className="text-[var(--muted)]">{driver.label}</span>
                  <span className="tabular-nums text-[var(--accent)]">{formatNumber(driver.weight * 100, 0)}%</span>
                </div>
                <div className="h-1.5 bg-[color:var(--panel-3)]">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${driver.weight * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-[color:var(--panel-4)] p-1">
        <div className="flex gap-1 overflow-x-auto">
          {relatedPairs.map((pair) => (
            <Link key={pair.id} to={`/app/markets/${pair.id}`} className="min-w-[152px] flex-1 bg-[color:var(--panel)] p-3 transition hover:bg-[color:var(--panel-2)]">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{pair.symbol}</div>
              <div className="mt-2 text-lg font-bold tabular-nums text-[var(--text)]">{formatNumber(pair.spreadEstimate, 1)}</div>
              <div className="mt-1 text-[11px] text-[var(--accent)]">Event {pair.eventRiskBase} · Carry {pair.carryScore}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">News</div>
            <div className="space-y-3">
              {news.slice(0, 4).map((item) => (
                <div key={item.id} className="bg-[color:var(--panel-2)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.source}</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text)]">{item.headline}</div>
                    </div>
                    <Badge tone={item.sentiment === 'bullish' ? 'accent' : item.sentiment === 'bearish' ? 'danger' : 'default'}>{item.sentiment}</Badge>
                  </div>
                  <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{item.whyItMatters ?? item.explanation ?? item.summary ?? 'Live currency headline without attached analyst evaluation.'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Upcoming Events</div>
            <div className="space-y-3">
              {events.slice(0, 4).map((event) => (
                <Link key={event.id} to={`/app/events/${event.id}`} className="block bg-[color:var(--panel-2)] p-3 transition hover:bg-[color:var(--panel-3)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{event.region}</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text)]">{event.title}</div>
                    </div>
                    <Badge tone={event.impact === 'high' ? 'danger' : event.impact === 'medium' ? 'warning' : 'default'}>{event.impact}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">{event.summary ?? event.scenarioNarrative ?? 'Official release captured in the current currency tape.'}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Historical Narrative</div>
            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.title} className="grid grid-cols-[10px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                    <div className="mt-1 flex-1 w-px bg-[color:rgba(141,164,179,0.18)]" />
                  </div>
                  <div className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{item.dateLabel}</div>
                    </div>
                    <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{item.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Analyst Notes</div>
            <div className="space-y-3">
              {notes.length ? notes.map((note) => (
                <div key={note.id} className="bg-[color:var(--panel-2)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{title(note.template)}</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text)]">{note.title}</div>
                    </div>
                    {note.pinned ? <Badge tone="accent">Pinned</Badge> : null}
                  </div>
                  <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{note.body}</div>
                </div>
              )) : <div className="bg-[color:var(--panel-2)] p-3 text-sm text-[var(--muted)]">No notes linked to {currency.code} yet.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
