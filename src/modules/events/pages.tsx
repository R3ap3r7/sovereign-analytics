import { type MouseEventHandler, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, LoadingPanel, Page, Panel, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { formatDateTime, formatNumber } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

const toneForImpact = (impact: string) => {
  if (impact === 'high') return 'danger'
  if (impact === 'medium') return 'warning'
  return 'default'
}

const toneForSentiment = (sentiment: string) => {
  if (sentiment === 'bullish') return 'accent'
  if (sentiment === 'bearish') return 'danger'
  return 'default'
}

const CompactSection = ({ label, title, detail }: { label: string; title: string; detail?: string }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">{title}</h2>
    </div>
    {detail ? <div className="max-w-md text-right text-xs leading-5 text-[var(--muted)]">{detail}</div> : null}
  </div>
)

const MiniPill = ({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'warning' | 'danger' }) => (
  <span
    className={[
      'inline-flex items-center rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
      tone === 'accent'
        ? 'border-[rgba(105,211,192,0.24)] bg-[rgba(105,211,192,0.08)] text-[var(--accent)]'
        : tone === 'warning'
          ? 'border-[rgba(224,180,108,0.24)] bg-[rgba(224,180,108,0.08)] text-[var(--warning)]'
          : tone === 'danger'
            ? 'border-[rgba(227,128,120,0.24)] bg-[rgba(227,128,120,0.08)] text-[var(--danger)]'
            : 'border-[var(--line)] bg-white/[0.03] text-[var(--muted)]',
    ].join(' ')}
  >
    {children}
  </span>
)

const CompactButton = ({
  children,
  onClick,
  type = 'button',
}: {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit'
}) => (
  <button
    className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]"
    onClick={onClick}
    type={type}
  >
    {children}
  </button>
)

export const EventsPage = () => {
  const { data, loading } = useAsyncResource(() => Promise.all([appApi.listEvents(), appApi.listNews()]).then(([events, news]) => ({ events, news })), [])
  const [impact, setImpact] = useState('all')
  const [currency, setCurrency] = useState('all')
  const [region, setRegion] = useState('all')
  const [type, setType] = useState('all')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const filteredEvents = useMemo(
    () =>
      !data
        ? []
        :
      data.events
        .filter((event) => (impact === 'all' ? true : event.impact === impact))
        .filter((event) => (currency === 'all' ? true : event.currencyCodes.includes(currency)))
        .filter((event) => (region === 'all' ? true : event.region === region))
        .filter((event) => (type === 'all' ? true : event.type === type)),
    [data, impact, currency, region, type],
  )
  const filteredNews = useMemo(
    () => (!data ? [] : data.news.filter((item) => (currency === 'all' ? true : item.currencyCodes.includes(currency)))),
    [data, currency],
  )

  useEffect(() => {
    if (!data) return
    if (!filteredEvents.length) {
      setSelectedEventId(null)
      return
    }
    if (!selectedEventId || !filteredEvents.some((item) => item.id === selectedEventId)) {
      setSelectedEventId(filteredEvents[0].id)
    }
  }, [data, filteredEvents, selectedEventId])

  if (loading || !data) return <LoadingPanel label="Loading news and events…" />

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null
  const topNarrative = [...filteredEvents]
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3)

  return (
    <Page title="News & Events">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.25fr_0.75fr]">
              <div className="bg-[color:var(--panel-2)] px-5 py-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Macro board</div>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">{selectedEvent?.title ?? 'Event focus'}</h2>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {filteredEvents.length} events · {filteredNews.length} stories · {filteredEvents.filter((event) => event.impact === 'high').length} high impact
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {topNarrative.map((event) => (
                    <MiniPill key={event.id} tone={toneForImpact(event.impact)}>
                      {event.currencyCodes[0]} {event.type}
                    </MiniPill>
                  ))}
                </div>
                <div className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {selectedEvent ? selectedEvent.scenarioNarrative : 'No event selected.'}
                </div>
              </div>
              <div className="grid gap-px bg-[var(--line)] sm:grid-cols-3 xl:grid-cols-1">
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Urgency</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--text)]">{selectedEvent ? formatNumber(selectedEvent.urgency, 0) : '0'}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Currency</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--text)]">{selectedEvent?.currencyCodes.join(' / ') ?? 'None'}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Window</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selectedEvent ? formatDateTime(selectedEvent.scheduledAt) : 'None'}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-[var(--line)] lg:grid-cols-4">
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Impact</div>
                <select className="mt-3 w-full border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text)] outline-none" value={impact} onChange={(event) => setImpact(event.target.value)}>
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Currency</div>
                <select className="mt-3 w-full border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text)] outline-none" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="all">All</option>
                  {['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD', 'INR', 'CNY'].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Region</div>
                <select className="mt-3 w-full border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text)] outline-none" value={region} onChange={(event) => setRegion(event.target.value)}>
                  <option value="all">All</option>
                  {Array.from(new Set(data.events.map((event) => event.region))).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Type</div>
                <select className="mt-3 w-full border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text)] outline-none" value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="all">All</option>
                  {Array.from(new Set(data.events.map((event) => event.type))).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <Panel className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-[var(--line)] bg-[color:var(--panel)] px-4 py-3">
                <CompactSection label="Calendar" title="Economic events" detail={selectedEvent?.region} />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[color:var(--panel-2)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">Curr.</th>
                      <th className="px-4 py-3 text-left">Impact</th>
                      <th className="px-4 py-3 text-left">Urgency</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => {
                      const active = event.id === selectedEvent?.id
                      return (
                        <tr
                          className={[
                            'cursor-pointer border-t border-[var(--line)] transition-colors',
                            active ? 'bg-[color:var(--panel-3)]' : 'bg-[color:var(--panel-2)]/70 hover:bg-[color:var(--panel-3)]',
                          ].join(' ')}
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                        >
                          <td className="px-4 py-4 align-top text-xs text-[var(--muted)]">{formatDateTime(event.scheduledAt)}</td>
                          <td className="px-4 py-4 align-top">
                            <div className="font-medium text-[var(--text)]">{event.title}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">{event.region}</div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {event.currencyCodes.slice(0, 3).map((code) => (
                                <span key={code} className="rounded-[2px] border border-[var(--line)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                  {code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <Badge tone={toneForImpact(event.impact)}>{event.impact}</Badge>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="text-sm font-medium text-[var(--text)]">{formatNumber(event.urgency, 0)}</div>
                            <div className="mt-2 h-1.5 w-24 bg-[color:var(--panel-4)]">
                              <div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--warning))]" style={{ width: `${Math.min(event.urgency, 100)}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:text-[var(--accent)]"
                                to={`/app/events/${event.id}`}
                              >
                                Open
                              </Link>
                              <CompactButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                              >
                                Focus
                              </CompactButton>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel>
                <CompactSection
                  label="Inspector"
                  title={selectedEvent ? selectedEvent.title : 'Event'}
                  detail={selectedEvent ? selectedEvent.scenarioNarrative : undefined}
                />
                {selectedEvent ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Stat label="Region" value={selectedEvent.region} />
                    <Stat label="Time" value={formatDateTime(selectedEvent.scheduledAt)} />
                    <Stat label="Impact" value={selectedEvent.impact} />
                    <Stat label="Urgency" value={formatNumber(selectedEvent.urgency, 0)} />
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-[var(--muted)]">No event selected.</div>
                )}
              </Panel>

              <Panel>
                <CompactSection label="Pairs" title="Linked pairs" />
                <div className="mt-4 space-y-2">
                  {selectedEvent && selectedEvent.pairIds.length ? (
                    selectedEvent.pairIds.slice(0, 4).map((pairId) => (
                      <div className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={pairId}>
                        <div className="font-medium text-[var(--text)]">{pairId.toUpperCase()}</div>
                        <div className="flex flex-wrap gap-2">
                          <Link className="text-[var(--accent)] transition hover:text-[var(--text)]" to={`/app/markets/${pairId}`}>
                            Open
                          </Link>
                          <Link className="text-[var(--accent)] transition hover:text-[var(--text)]" to={`/app/simulation?pair=${pairId}`}>
                            Sim
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--muted)]">No pair links.</div>
                  )}
                </div>
              </Panel>

              <Panel>
                <CompactSection label="Currencies" title="Linked currencies" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedEvent?.currencyCodes.map((code) => (
                    <Link key={code} to={`/app/currencies/${code}`}>
                      <MiniPill tone="default">{code}</MiniPill>
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <CompactSection label="Focus" title="Top urgency" />
            <div className="mt-4 space-y-3">
              {topNarrative.map((event) => (
                <button
                  className={[
                    'w-full border border-[var(--line)] px-4 py-3 text-left transition-colors',
                    event.id === selectedEvent?.id ? 'bg-[color:var(--panel-3)]' : 'bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-3)]',
                  ].join(' ')}
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[var(--text)]">{event.title}</div>
                    <Badge tone={toneForImpact(event.impact)}>{event.impact}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">{formatDateTime(event.scheduledAt)}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <CompactSection label="News" title="Stream" />
            <div className="mt-4 space-y-3">
              {filteredNews.slice(0, 6).map((item) => (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--text)]">{item.headline}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{item.source} · {formatDateTime(item.timestamp)}</div>
                    </div>
                    <Badge tone={toneForSentiment(item.sentiment)}>{item.sentiment}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.currencyCodes.slice(0, 3).map((code) => (
                      <span key={code} className="rounded-[2px] border border-[var(--line)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {code}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.whyItMatters}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}

export const EventDetailPage = () => {
  const { setActiveSimulation } = useAppState()
  const navigate = useNavigate()
  const params = useParams()
  const { data, loading } = useAsyncResource(() => appApi.getEventWorkspace(params.eventId ?? ''), [params.eventId])
  useEffect(() => {
    if (params.eventId) appApi.saveVisited('events', params.eventId)
  }, [params.eventId])

  if (loading || !data) return <LoadingPanel label="Loading event inspector…" />

  const scenarioPairs = data.pairs.slice(0, 4)

  return (
    <Page title={data.event.title}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-[color:var(--panel-2)] px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={toneForImpact(data.event.impact)}>{data.event.impact}</Badge>
                  <Badge tone={data.event.status === 'upcoming' ? 'warning' : 'accent'}>{data.event.status}</Badge>
                  <Badge tone="default">{data.event.type}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-5">
                  <Stat label="Region" value={data.event.region} />
                  <Stat label="Timing" value={formatDateTime(data.event.scheduledAt)} />
                  <Stat label="Urgency" value={formatNumber(data.event.urgency, 0)} />
                  <Stat label="Prior" value={data.event.prior} />
                  <Stat label="Forecast" value={data.event.forecast} />
                </div>
                <div className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {data.event.actual ? `Actual ${data.event.actual}` : 'Actual pending'}
                </div>
                {data.pairs[0] ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:text-[var(--accent)]" to={`/app/markets/${data.pairs[0].id}`}>
                      Open {data.pairs[0].symbol}
                    </Link>
                    <button
                      className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:text-[var(--accent)]"
                      onClick={() => {
                        setActiveSimulation(appApi.buildSimulationFromPair(data.pairs[0].id))
                        navigate(`/app/simulation?pair=${data.pairs[0].id}`)
                      }}
                      type="button"
                    >
                      Sim {data.pairs[0].symbol}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="space-y-px bg-[var(--line)]">
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Event line</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--text)]">{data.event.scenarioNarrative}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Impact set</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.event.currencyCodes.slice(0, 5).map((code) => (
                      <MiniPill key={code}>{code}</MiniPill>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel>
              <CompactSection label="Scenarios" title="Directional outcomes" detail="Short-horizon market responses." />
              <div className="mt-4 space-y-3">
                <div className="border border-[rgba(105,211,192,0.22)] bg-[rgba(105,211,192,0.08)] px-4 py-3 text-sm text-[var(--text)]">
                  Stronger print: supports the local currency and sharpens repricing.
                </div>
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--text)]">
                  In-line print: keeps the current market story intact.
                </div>
                <div className="border border-[rgba(227,128,120,0.22)] bg-[rgba(227,128,120,0.08)] px-4 py-3 text-sm text-[var(--text)]">
                  Softer print: pressures the currency and opens reversal risk in linked pairs.
                </div>
              </div>
            </Panel>

            <Panel>
              <CompactSection label="Actions" title="Quick launch" />
              <div className="mt-4 space-y-2">
                {scenarioPairs.length ? (
                  scenarioPairs.map((pair) => (
                    <div className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={pair.id}>
                      <div>
                        <div className="font-medium text-[var(--text)]">{pair.symbol}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{pair.narrative}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link className="text-[var(--accent)] transition hover:text-[var(--text)]" to={`/app/markets/${pair.id}`}>
                          Open
                        </Link>
                        <button
                          className="text-[var(--accent)] transition hover:text-[var(--text)]"
                          onClick={() => {
                            setActiveSimulation(appApi.buildSimulationFromPair(pair.id))
                            navigate(`/app/simulation?pair=${pair.id}`)
                          }}
                          type="button"
                        >
                          Sim
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--muted)]">No linked pairs.</div>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <CompactSection label="Currencies" title="Macro linkage" />
              <div className="mt-4 grid gap-2">
                {data.currencies.map((currency) => (
                  <Link className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 transition hover:bg-[color:var(--panel-3)]" key={currency.code} to={`/app/currencies/${currency.code}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text)]">{currency.code}</div>
                      <Badge tone="default">{currency.centralBank}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Stat label="Strength" value={formatNumber(currency.strengthScore, 0)} />
                      <Stat label="Risk" value={formatNumber(currency.riskScore, 0)} />
                      <Stat label="Sensitivity" value={formatNumber(currency.eventSensitivity, 0)} />
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel>
              <CompactSection label="Comparable" title="Related events" />
              <div className="mt-4 space-y-2">
                {data.comparableEvents.map((event) => (
                  <Link className="block border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 transition hover:bg-[color:var(--panel-3)]" key={event.id} to={`/app/events/${event.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text)]">{event.title}</div>
                      <Badge tone={toneForImpact(event.impact)}>{event.impact}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-[var(--muted)]">{event.region} · {formatDateTime(event.scheduledAt)}</div>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <CompactSection label="Inspector" title="Event detail" />
            <div className="mt-4 space-y-3">
              <Stat label="Status" value={data.event.status} />
              <Stat label="Impact" value={data.event.impact} />
              <Stat label="Urgency" value={formatNumber(data.event.urgency, 0)} />
            </div>
          </Panel>

          <Panel>
            <CompactSection label="Pairs" title="Linked pairs" />
            <div className="mt-4 space-y-2">
              {data.pairs.map((pair) => (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={pair.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[var(--text)]">{pair.symbol}</div>
                    <MiniPill tone={toneForImpact(data.event.impact)}>{pair.classification}</MiniPill>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">{pair.narrative}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="text-[var(--accent)] transition hover:text-[var(--text)]" to={`/app/markets/${pair.id}`}>
                      Open
                    </Link>
                    <button
                      className="text-[var(--accent)] transition hover:text-[var(--text)]"
                      onClick={() => {
                        setActiveSimulation(appApi.buildSimulationFromPair(pair.id))
                        navigate(`/app/simulation?pair=${pair.id}`)
                      }}
                      type="button"
                    >
                      Sim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <CompactSection label="News" title="Related coverage" />
            <div className="mt-4 space-y-2">
              {data.relatedNews.map((item) => (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--text)]">{item.headline}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{item.source}</div>
                    </div>
                    <Badge tone={toneForSentiment(item.sentiment)}>{item.sentiment}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
