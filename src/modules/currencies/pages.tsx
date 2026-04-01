import { Link, useParams } from 'react-router-dom'
import { NoteCard, PairCard, NewsCard, EventCard } from '../../components/domain/cards'
import { Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { formatNumber, formatPercent } from '../../lib/utils'
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

const trendTone = (value: number) => {
  if (value >= 70) return 'up'
  if (value <= 35) return 'down'
  return 'flat'
}

const Ring = ({ value }: { value: number }) => (
  <div className="relative size-16 rounded-full border border-[var(--line)] bg-[color:var(--panel-4)]">
    <div
      className="absolute inset-2 rounded-full border border-[rgba(105,211,192,0.22)]"
      style={{
        background: `conic-gradient(var(--accent) 0 ${value}%, rgba(255,255,255,0.06) ${value}% 100%)`,
      }}
    />
    <div className="absolute inset-[18px] flex items-center justify-center rounded-full border border-[var(--line)] bg-[color:var(--panel)] text-[11px] font-semibold text-[var(--text)]">
      {value.toFixed(0)}
    </div>
  </div>
)

const CurrencyMiniRow = ({
  code,
  name,
  region,
  strength,
  risk,
  actionLabel,
}: {
  code: string
  name: string
  region: string
  strength: number
  risk: number
  actionLabel: string
}) => (
  <div className="grid grid-cols-[1.2fr_0.8fr] gap-3 rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 px-3 py-3">
    <div>
      <div className="font-display text-sm font-semibold tracking-[-0.02em] text-[var(--text)]">
        {code} <span className="text-[var(--muted)]">{name}</span>
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{region}</div>
    </div>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Strength</div>
        <div className="mt-1 text-sm font-medium text-[var(--text)]">{formatNumber(strength, 0)}</div>
      </div>
      <div className="min-w-0 text-right">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Risk</div>
        <div className="mt-1 text-sm font-medium text-[var(--text)]">{formatNumber(risk, 0)}</div>
      </div>
      <div className="hidden text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] md:block">{actionLabel}</div>
    </div>
  </div>
)

export const CurrenciesPage = () => {
  const { data, loading } = useAsyncResource(() => appApi.listCurrencies(), [])

  if (loading || !data) return <LoadingPanel label="Loading currency intelligence…" />

  const strongest = [...data].sort((a, b) => b.strengthScore - a.strengthScore)
  const mostRiskSensitive = [...data].sort((a, b) => b.eventSensitivity - a.eventSensitivity)
  const reserveHeavy = data.filter((item) => item.classificationTags.includes('reserve currency'))
  const safeHavens = data.filter((item) => item.classificationTags.includes('safe haven'))
  const policySensitive = data.filter((item) => item.classificationTags.includes('policy-sensitive'))

  return (
    <Page
      title="Currency Intelligence"
      description="Profiles, macro state, linked pairs"
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="terminal-grid overflow-hidden">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Currency map</div>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-[var(--text)] lg:text-[1.9rem]">
                Macro and policy view
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="accent">{formatNumber(data.length, 0)} profiles</Badge>
                <Badge tone={reserveHeavy.length > 0 ? 'accent' : 'default'}>{formatNumber(reserveHeavy.length, 0)} reserve currencies</Badge>
                <Badge tone={safeHavens.length > 0 ? 'warning' : 'default'}>{formatNumber(safeHavens.length, 0)} safe havens</Badge>
                <Badge tone={policySensitive.length > 0 ? 'warning' : 'default'}>{formatNumber(policySensitive.length, 0)} policy-sensitive</Badge>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[21rem] xl:grid-cols-1">
              <Stat
                label="Top strength"
                value={strongest[0] ? strongest[0].code : '—'}
              />
              <Stat
                label="Highest event sensitivity"
                value={mostRiskSensitive[0] ? mostRiskSensitive[0].code : '—'}
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Comparison rail" title="Quick read" />
          <div className="space-y-3">
            {strongest.slice(0, 5).map((currency) => (
              <CurrencyMiniRow
                actionLabel={strengthLabel(currency.strengthScore)}
                code={currency.code}
                key={currency.code}
                name={currency.name}
                region={currency.regionName}
                risk={currency.eventSensitivity}
                strength={currency.strengthScore}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <SectionTitle eyebrow="Strength ranking" title="Market standing" />
          <div className="space-y-3">
            {strongest.slice(0, 8).map((currency, index) => {
              const width = Math.max(8, Math.min(currency.strengthScore, 100))
              return (
                <Link
                  className="group block rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4 transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]"
                  key={currency.code}
                  to={`/app/currencies/${currency.code}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-display text-lg font-semibold tracking-[-0.02em]">{index + 1}. {currency.code}</div>
                        <Badge tone={scoreTone(currency.strengthScore)}>{strengthLabel(currency.strengthScore)}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{currency.name} · {currency.regionName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Strength</div>
                      <div className="mt-1 text-lg font-semibold text-[var(--text)]">{formatNumber(currency.strengthScore, 0)}</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--panel)]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),rgba(105,211,192,0.25))]" style={{ width: `${width}%` }} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel)]/80 px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Policy rate</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatPercent(currency.macro.policyRate)}</div>
                    </div>
                    <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel)]/80 px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Risk</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatNumber(currency.riskScore, 0)}</div>
                    </div>
                    <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel)]/80 px-3 py-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Event load</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{formatNumber(currency.eventSensitivity, 0)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{currency.currentSummary}</div>
                </Link>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Event pressure" title="Headline sensitivity" />
          <div className="space-y-3">
            {mostRiskSensitive.slice(0, 8).map((currency) => (
              <Link
                className="group block rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4 transition hover:border-[rgba(224,180,108,0.32)] hover:bg-[color:var(--panel-3)]"
                key={currency.code}
                to={`/app/currencies/${currency.code}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-lg font-semibold tracking-[-0.02em]">{currency.code}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{currency.centralBank}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ring value={currency.eventSensitivity} />
                    <Badge tone={currency.riskScore >= 70 ? 'warning' : 'default'}>{formatNumber(currency.riskScore, 0)} risk</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {currency.classificationTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel)]/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{currency.currentSummary}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((currency) => (
          <Link key={currency.code} to={`/app/currencies/${currency.code}`}>
            <Panel className="group h-full transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {currency.regionName} · {currency.centralBank}
                  </div>
                  <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">{currency.code}</h2>
                  <div className="mt-1 text-sm text-[var(--muted)]">{currency.name}</div>
                </div>
                <Badge tone={scoreTone(currency.strengthScore)}>{strengthLabel(currency.strengthScore)}</Badge>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{currency.currentSummary}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {currency.classificationTags.slice(0, 4).map((tag) => (
                  <span
                    className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-4)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Strength" value={formatNumber(currency.strengthScore, 0)} tone={trendTone(currency.strengthScore)} />
                <Stat label="Risk" value={formatNumber(currency.riskScore, 0)} tone={currency.riskScore >= 70 ? 'down' : 'flat'} />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Policy rate</div>
                  <div className="mt-1 text-sm text-[var(--text)]">{formatPercent(currency.macro.policyRate)}</div>
                </div>
                <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Event sensitivity</div>
                  <div className="mt-1 text-sm text-[var(--text)]">{formatNumber(currency.eventSensitivity, 0)}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                <span>Open profile</span>
                <span className="transition group-hover:text-[var(--accent)]">→</span>
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </Page>
  )
}

export const CurrencyDetailPage = () => {
  const { user } = useAppState()
  const params = useParams()
  const { data, loading } = useAsyncResource(() => appApi.getCurrencyWorkspace(params.currencyCode ?? ''), [params.currencyCode, user?.id])

  if (loading || !data) return <LoadingPanel label="Loading currency profile…" />

  const { currency, pairs, events, news, notes } = data

  return (
    <Page
      title={`${currency.code} · ${currency.name}`}
      description={`${currency.regionName} · ${currency.centralBank}`}
    >
      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Panel className="terminal-grid overflow-hidden">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Currency profile</div>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div>
                  <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">{currency.code}</h2>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {currency.name} · {currency.regionName} · {currency.centralBank}
                  </div>
                </div>
                <div className="max-w-2xl rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-4)] px-4 py-3">
                  <div className="text-sm leading-6 text-[var(--text)]">{currency.currentSummary}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {currency.classificationTags.map((tag) => (
                  <Badge key={tag} tone="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[21rem] xl:grid-cols-1">
              <Stat label="Strength score" value={formatNumber(currency.strengthScore, 0)} help="Feeds dashboard ranking and pair narratives." />
              <Stat label="Risk score" value={formatNumber(currency.riskScore, 0)} help="Raises attention across the explorer and event views." tone={currency.riskScore >= 70 ? 'down' : 'flat'} />
              <Stat label="Policy rate" value={formatPercent(currency.macro.policyRate)} help={currency.centralBankState.summary} />
              <Stat label="Event sensitivity" value={formatNumber(currency.eventSensitivity, 0)} help="Controls how heavily events are surfaced." />
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Snapshot" title="Market posture" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Strength direction</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">{strengthLabel(currency.strengthScore)}</div>
            </div>
            <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Policy stance</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">{currency.centralBankState.currentTone}</div>
            </div>
            <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Reserve role</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">{formatNumber(currency.macro.reserveRole, 0)}</div>
            </div>
            <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">External sensitivity</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">{formatNumber(currency.macro.externalSensitivity, 0)}</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <Panel>
          <SectionTitle eyebrow="Macro" title="Current state" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Inflation" value={formatPercent(currency.macro.inflation)} />
            <Stat label="GDP growth" value={formatPercent(currency.macro.gdpGrowth)} />
            <Stat label="Unemployment" value={formatPercent(currency.macro.unemployment)} />
            <Stat label="Trade balance" value={formatNumber(currency.macro.tradeBalance)} />
            <Stat label="Debt / GDP" value={formatPercent(currency.macro.debtToGdp)} />
            <Stat label="Manufacturing" value={formatNumber(currency.macro.manufacturingTrend)} />
            <Stat label="Consumer strength" value={formatNumber(currency.macro.consumerStrength)} />
            <Stat label="Reserve role" value={formatNumber(currency.macro.reserveRole, 0)} />
            <Stat label="External sensitivity" value={formatNumber(currency.macro.externalSensitivity, 0)} />
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Central bank" title={currency.centralBank} />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 px-4 py-3">
              <Badge tone={currency.centralBankState.currentTone === 'tightening' ? 'warning' : currency.centralBankState.currentTone === 'easing' ? 'accent' : 'default'}>
                {currency.centralBankState.currentTone}
              </Badge>
              <div className="text-sm leading-6 text-[var(--muted)]">{currency.centralBankState.summary}</div>
            </div>
            <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-4)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Expectation</div>
              <div className="mt-2">{currency.centralBankState.expectation}</div>
            </div>
            <div className="space-y-2">
              {currency.centralBankState.toneHistory.map((item) => (
                <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-sm font-semibold tracking-[-0.02em]">{item.label}</div>
                    <Badge tone={item.tone === 'tightening' ? 'warning' : item.tone === 'easing' ? 'accent' : 'default'}>{item.tone}</Badge>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <SectionTitle eyebrow="Drivers" title="Stack" />
          <div className="space-y-3">
            {currency.drivers.map((driver) => (
              <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={driver.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-base font-semibold tracking-[-0.02em]">{driver.label}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{driver.description}</div>
                  </div>
                  <div className="w-24 text-right">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Weight</div>
                    <div className="mt-2 text-sm font-medium text-[var(--text)]">{formatNumber(driver.weight * 100, 0)}%</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--panel)]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),rgba(105,211,192,0.2))]" style={{ width: `${driver.weight * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Related pairs" title="Linked pairs" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            {pairs.map((pair) => (
              <PairCard
                href={`/app/markets/${pair.id}`}
                key={pair.id}
                meta={<div className="text-[var(--muted)]">Spread {pair.spreadEstimate} · Event risk {pair.eventRiskBase}</div>}
                pair={pair}
                subtitle={pair.narrative}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionTitle eyebrow="Events and news" title="Live context" />
          <div className="space-y-4">
            {events.slice(0, 4).map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {news.slice(0, 3).map((item) => (
              <NewsCard item={item} key={item.id} />
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionTitle eyebrow="Timeline" title="Historical narrative" />
            <div className="space-y-3">
              {currency.historicalNarrative.map((item) => (
                <div className="rounded-[4px] border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={item.title}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-display text-base font-semibold tracking-[-0.02em]">{item.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{item.dateLabel}</div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.summary}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Notes" title="Saved analysis" />
            <div className="space-y-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
